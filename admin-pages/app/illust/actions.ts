'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { createAtelier, updateAtelier, getAtelier, createTag, type AtelierInput } from '@/lib/db'
import { purgeAtelierCache } from '@/lib/cache'
import { withPurgeResult } from '@/lib/purge_result'
import { saveAtelierDraft } from '@/lib/draft'
import { notifyAtelierPublishToSNS } from '@/lib/sns'
import { generateContentID } from '@/lib/id'
import { parseContentFormat } from '@/lib/content-format'
import { parseStatus, statusTransitionError } from '@/lib/status'
import { saveFailed } from '@/lib/save-error'
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

// 新規作成後の遷移先。公開サイトのキャッシュ削除に失敗しても保存は成立させ、遷移先の画面で知らせる
function createdURL(illustID: string, purged: boolean): string {
  return withPurgeResult(`/illust/${illustID}/edit?saved=1`, purged)
}

// 新規作成。エラーは state で返して入力を保持し、成功したら作成したイラストの編集画面へ遷移する（URL が変わるため）
export async function createAtelierAction(_prev: SaveActionState, formData: FormData): Promise<SaveActionState> {
  const { input, error } = parseAtelierForm(formData)
  if (error) {
    return { error }
  }
  if (await getAtelier(input.id)) {
    return { error: `ID '${input.id}' は既に使用されています` }
  }

  try {
    await createAtelier(input)
  } catch (e) {
    return saveFailed(e)
  }
  const purged = await purgeAtelierCache(input.id)
  await notifyAtelierPublishToSNS({ input, previouslyPublished: false })

  revalidatePath('/illust')
  redirect(createdURL(input.id, purged))
}

// 更新。ページ遷移させず結果を state で返す（遷移すると編集中の内容が消えるため）
export async function updateAtelierAction(_prev: SaveActionState, formData: FormData): Promise<SaveActionState> {
  const { input, error } = parseAtelierForm(formData)
  if (error) {
    return { error }
  }
  const current = await getAtelier(input.id)
  if (!current) {
    return { error: `イラスト '${input.id}' が見つかりません` }
  }
  const transitionError = statusTransitionError(current, input.status)
  if (transitionError) {
    return { error: transitionError }
  }

  try {
    await updateAtelier(input, current)
  } catch (e) {
    return saveFailed(e)
  }
  const purged = await purgeAtelierCache(input.id)
  await notifyAtelierPublishToSNS({ input, previouslyPublished: current.published_at !== null })

  revalidatePath('/illust')
  return { saved: true, purgeFailed: !purged }
}

// 編集中の内容をKVに保存し、pages本体のプレビューURLを返す（D1には書き込まない）
// ページ遷移させず結果を useActionState で返す（遷移すると編集中の本文が消えるため）
export async function previewAtelierAction(
  _prev: PreviewActionState,
  formData: FormData
): Promise<PreviewActionState> {
  const { input, error } = parseAtelierForm(formData)
  if (error) {
    return { error }
  }

  // draftKeyは既定で維持し、チェックされたときのみ再生成する（プレビューURLの変更を任意にする）
  const regenerateKey = formData.get('regenerate_draft_key') === 'on'
  const draftKey = await saveAtelierDraft(input, regenerateKey)
  const { env } = await getCloudflareContext({ async: true })
  return { previewURL: `${env.PAGES_HOST}/illust/detail/${input.id}?draftKey=${draftKey}` }
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
