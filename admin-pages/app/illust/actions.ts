'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAtelier, updateAtelier, getAtelier, createTag, type AtelierInput } from '@/lib/db'
import { purgeAtelierCache } from '@/lib/cache'
import { createdURL } from '@/lib/purge_result'
import { atelierDraft } from '@/lib/draft'
import { notifyAtelierPublishToSNS } from '@/lib/sns'
import { generateContentID } from '@/lib/id'
import { parseContentFormat } from '@/lib/content-format'
import { parseStatus, statusTransitionError } from '@/lib/status'
import { saveFailed, draftSyncFailed, previewFailed } from '@/lib/save-error'
import type { PreviewActionState, PurgeActionState, SaveActionState } from '@/lib/form-state'
import { text } from '@/lib/form-data'

const VALID_POSITION = ['center', 'top', 'bottom', 'left', 'right']

function parseAtelierForm(formData: FormData): { input: AtelierInput; error?: string } {
  const id = text(formData, 'id') || generateContentID()
  const title = text(formData, 'title')
  const src = text(formData, 'src')
  const objectPosition = text(formData, 'object_position')
  const description = (formData.get('description') as string | null) ?? ''
  const tagIDs = formData.getAll('tag_ids').map((v) => String(v))

  const input: AtelierInput = {
    id,
    title,
    src,
    object_position: VALID_POSITION.includes(objectPosition) ? objectPosition : 'center',
    description,
    description_format: parseContentFormat(formData.get('description_format') as string | null),
    status: parseStatus(text(formData, 'status')),
    tagIDs,
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return { input, error: 'IDは英数字・ハイフン・アンダースコアのみ使用できます' }
  }
  if (title === '' || src === '') {
    return { input, error: 'タイトルと画像URLは必須です' }
  }
  return { input }
}

// 新規作成。エラーは state で返して入力を保持し、成功したら作成したイラストの編集画面へ遷移する（URL が変わるため）
export async function createAtelierAction(_prev: SaveActionState, formData: FormData): Promise<SaveActionState> {
  const { input, error } = parseAtelierForm(formData)
  if (error) {
    return { error }
  }
  // D1 の例外（ID の重複確認も含む）は state のエラーにして入力を保持する（issue #1311）。redirect は例外で遷移するので try の外に置く
  try {
    if (await getAtelier(input.id)) {
      return { error: `ID '${input.id}' は既に使用されています` }
    }
    await createAtelier(input)
  } catch (e) {
    return saveFailed(e)
  }
  // 本体は保存できたので、ここから先の失敗は保存の失敗にしない（パージと KV の同期は遷移先で知らせ、SNS は記録だけ）。
  // 下書きなら KV にもプレビューを書く（遷移先の編集ページが URL を表示する）。パージ・SNS 通知と独立なので並行する
  const [purged, draft] = await Promise.all([
    purgeAtelierCache(input.id),
    atelierDraft.syncAfterSave(input, null).catch(draftSyncFailed),
    notifyAtelierPublishToSNS({ input, current: null }),
  ])

  revalidatePath('/illust')
  redirect(createdURL(`/illust/${input.id}/edit`, { purged, warning: draft.warning }))
}

// 更新。ページ遷移させず結果を state で返す（遷移すると編集中の内容が消えるため）
export async function updateAtelierAction(_prev: SaveActionState, formData: FormData): Promise<SaveActionState> {
  const { input, error } = parseAtelierForm(formData)
  if (error) {
    return { error }
  }
  // D1 の例外（保存前の行の読み取りも含む）は state のエラーにして入力を保持する（issue #1311）
  try {
    const current = await getAtelier(input.id)
    if (!current) {
      return { error: `イラスト '${input.id}' が見つかりません` }
    }
    const transitionError = statusTransitionError(current.status, input.status)
    if (transitionError) {
      return { error: transitionError }
    }
    await updateAtelier(input, current)
    // KV の同期（下書きならプレビューを更新、公開なら削除）はパージ・SNS 通知と独立なので並行する。
    // パージ・SNS 通知は自分で失敗を処理し、KV の同期は警告にするので、catch に来るのは実質 D1 の例外だけ
    const [purged, urls] = await Promise.all([
      purgeAtelierCache(input.id),
      atelierDraft.syncAfterSave(input, current).catch(draftSyncFailed),
      notifyAtelierPublishToSNS({ input, current }),
    ])

    revalidatePath('/illust')
    return { saved: true, purgeFailed: !purged, ...urls }
  } catch (e) {
    return saveFailed(e)
  }
}

// プレビュー URL の発行。編集中の内容を KV にだけ書く（D1 には保存しない）。
// ページ遷移させず結果を useActionState で返す（遷移すると編集中の本文が消えるため）
export async function previewAtelierAction(
  _prev: PreviewActionState,
  formData: FormData
): Promise<PreviewActionState> {
  const idGiven = text(formData, 'id') !== ''
  const { input, error } = parseAtelierForm(formData)
  if (error) {
    return { error }
  }

  // 保存前の行の読み取り（D1）と KV の書き込みの例外は state のエラーにし、Next のエラー画面で入力が消えないようにする
  try {
    const current = await getAtelier(input.id)
    const { previewURL, persistent } = await atelierDraft.issuePreview(input, current)
    return { previewURL, persistent, generatedID: idGiven ? undefined : input.id }
  } catch (e) {
    return previewFailed(e)
  }
}

// 編集画面からの手動キャッシュ削除。イラストの詳細も一覧のタグを持つので、一覧・単体まとめて削除される
export async function purgeAtelierCacheAction(_prev: PurgeActionState, formData: FormData): Promise<PurgeActionState> {
  const id = text(formData, 'id')
  if (id === '') {
    return { error: 'IDが不正です' }
  }
  try {
    if (!(await purgeAtelierCache(id))) {
      return { error: '公開サイトのキャッシュ削除に失敗しました。時間をおいて再度実行してください' }
    }
    return { done: 'イラストのキャッシュを削除しました（一覧・単体すべて）' }
  } catch {
    return { error: 'キャッシュ削除に失敗しました' }
  }
}

export async function createTagAction(formData: FormData): Promise<void> {
  const id = text(formData, 'id') || generateContentID()
  const tag = text(formData, 'tag')
  const type = text(formData, 'type')

  if (tag === '' || type === '') {
    redirect(`/illust/tags?error=${encodeURIComponent('タグ名と種別は必須です')}`)
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    redirect(`/illust/tags?error=${encodeURIComponent('IDは英数字・ハイフン・アンダースコアのみ使用できます')}`)
  }

  await createTag({ id, tag, type })

  revalidatePath('/illust/tags')
  redirect('/illust/tags')
}
