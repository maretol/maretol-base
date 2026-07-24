'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  createNovel,
  updateNovel,
  getNovel,
  setNovelNextID,
  setNovelPreviousID,
  createNovelTag,
  createNovelSeries,
  type NovelInput,
} from '@/lib/db_novel'
import type { novelRow } from 'api-types'
import { purgeNovelCache } from '@/lib/cache'
import { saveNovelDraft } from '@/lib/draft_novel'
import { notifyNovelPublishToSNS } from '@/lib/sns'
import { generateContentID } from '@/lib/id'
import { parseContentFormat } from '@/lib/content-format'
import type { PreviewActionState, PurgeActionState } from '@/lib/form-state'

const VALID_STATUS = ['PUBLISH', 'DRAFT', 'CLOSED'] as const
const ID_PATTERN = /^[a-zA-Z0-9_-]+$/

function text(formData: FormData, name: string): string {
  return ((formData.get(name) as string | null) ?? '').trim()
}

function textOrNull(formData: FormData, name: string): string | null {
  const v = text(formData, name)
  return v === '' ? null : v
}

function parseNovelForm(formData: FormData): { input: NovelInput; error?: string } {
  const id = text(formData, 'id') || generateContentID()
  const status = text(formData, 'status')

  // 発行日: date入力（YYYY-MM-DD）をJST 0時としてISO 8601 UTCに変換する（comicと同じ挙動）
  const publishDateRaw = text(formData, 'publish_date')
  const publishDate = publishDateRaw === '' ? null : new Date(`${publishDateRaw}T00:00:00+09:00`).toISOString()

  const input: NovelInput = {
    id,
    title_name: text(formData, 'title_name'),
    publish_date: publishDate,
    publish_event: textOrNull(formData, 'publish_event'),
    contents_url: text(formData, 'contents_url'),
    next_id: textOrNull(formData, 'next_id'),
    previous_id: textOrNull(formData, 'previous_id'),
    tag_id: text(formData, 'tag_id'),
    series_id: textOrNull(formData, 'series_id'),
    cover: textOrNull(formData, 'cover'),
    description: (formData.get('description') as string | null) ?? '',
    description_format: parseContentFormat(formData.get('description_format') as string | null),
    status: VALID_STATUS.includes(status as (typeof VALID_STATUS)[number]) ? (status as NovelInput['status']) : 'DRAFT',
  }

  if (!ID_PATTERN.test(input.id)) {
    return { input, error: 'IDは英数字・ハイフン・アンダースコアのみ使用できます' }
  }
  if (input.title_name === '' || input.contents_url === '') {
    return { input, error: 'タイトル・本文テキストURLは必須です' }
  }
  if (input.tag_id === '') {
    return { input, error: 'タグを選択してください' }
  }
  return { input }
}

type ChainNeighbors = { prev: novelRow | null; next: novelRow | null }

// チェーン制約の検証（comicのissue #1155と同じ方針）: 前後の巻は必ず同一シリーズ内で完結する
// 検証で取得した隣接小説の行は syncChainPointers で再利用する
async function validateChain(input: NovelInput): Promise<{ neighbors: ChainNeighbors; error?: string }> {
  const neighbors: ChainNeighbors = { prev: null, next: null }
  if (!input.previous_id && !input.next_id) {
    return { neighbors }
  }

  if (input.previous_id === input.id || input.next_id === input.id) {
    return { neighbors, error: '前の巻・次の巻に自分自身は指定できません' }
  }
  if (input.previous_id && input.previous_id === input.next_id) {
    return { neighbors, error: '前の巻と次の巻に同じ小説は指定できません' }
  }
  if (!input.series_id) {
    return { neighbors, error: '前の巻・次の巻を設定するにはシリーズの設定が必要です' }
  }
  if (input.previous_id) {
    neighbors.prev = await getNovel(input.previous_id)
    if (!neighbors.prev) {
      return { neighbors, error: `前の巻 '${input.previous_id}' が見つかりません` }
    }
    if (neighbors.prev.series_id !== input.series_id) {
      return { neighbors, error: `前の巻「${neighbors.prev.title_name}」が同じシリーズではありません` }
    }
  }
  if (input.next_id) {
    neighbors.next = await getNovel(input.next_id)
    if (!neighbors.next) {
      return { neighbors, error: `次の巻 '${input.next_id}' が見つかりません` }
    }
    if (neighbors.next.series_id !== input.series_id) {
      return { neighbors, error: `次の巻「${neighbors.next.title_name}」が同じシリーズではありません` }
    }
  }
  return { neighbors }
}

// 双方向リンクの自動同期。本体保存後に呼ぶ
// - 新しい前後の巻の逆ポインタは無条件に上書きする（保存のたびに整合性が収束する）
// - 付け替え・解除で残った旧リンクは、相手がまだ自分を指している場合のみ解除する
// 実施内容はメッセージとして返し、保存後の画面で可視化する
async function syncChainPointers(
  input: NovelInput,
  neighbors: ChainNeighbors,
  current: novelRow | null
): Promise<string[]> {
  const messages: string[] = []

  const oldPrevId = current?.previous_id ?? null
  if (oldPrevId && oldPrevId !== input.previous_id) {
    const oldPrev = await getNovel(oldPrevId)
    if (oldPrev?.next_id === input.id) {
      await setNovelNextID(oldPrevId, null)
      messages.push(`「${oldPrev.title_name}」の次の巻を解除しました`)
    }
  }
  const oldNextId = current?.next_id ?? null
  if (oldNextId && oldNextId !== input.next_id) {
    const oldNext = await getNovel(oldNextId)
    if (oldNext?.previous_id === input.id) {
      await setNovelPreviousID(oldNextId, null)
      messages.push(`「${oldNext.title_name}」の前の巻を解除しました`)
    }
  }
  if (neighbors.prev && neighbors.prev.next_id !== input.id) {
    await setNovelNextID(neighbors.prev.id, input.id)
    messages.push(`「${neighbors.prev.title_name}」の次の巻をこの小説に設定しました`)
  }
  if (neighbors.next && neighbors.next.previous_id !== input.id) {
    await setNovelPreviousID(neighbors.next.id, input.id)
    messages.push(`「${neighbors.next.title_name}」の前の巻をこの小説に設定しました`)
  }
  return messages
}

function chainInfoParam(messages: string[]): string {
  return messages.length > 0 ? `&info=${encodeURIComponent(messages.join(' / '))}` : ''
}

export async function createNovelAction(formData: FormData): Promise<void> {
  const { input, error } = parseNovelForm(formData)
  if (error) {
    redirect(`/novel/new?error=${encodeURIComponent(error)}`)
  }
  if (await getNovel(input.id)) {
    redirect(`/novel/new?error=${encodeURIComponent(`ID '${input.id}' は既に使用されています`)}`)
  }
  const { neighbors, error: chainError } = await validateChain(input)
  if (chainError) {
    redirect(`/novel/new?error=${encodeURIComponent(chainError)}`)
  }

  await createNovel(input)
  const syncMessages = await syncChainPointers(input, neighbors, null)
  await purgeNovelCache()
  await notifyNovelPublishToSNS({ input, type: 'new' })

  revalidatePath('/novel')
  // 保存後は一覧へ戻らず、作成した小説の編集画面へ遷移する（連続編集のため）
  redirect(`/novel/${input.id}/edit?saved=1${chainInfoParam(syncMessages)}`)
}

export async function updateNovelAction(formData: FormData): Promise<void> {
  const { input, error } = parseNovelForm(formData)
  if (error) {
    redirect(`/novel/${input.id}/edit?error=${encodeURIComponent(error)}`)
  }

  const { neighbors, error: chainError } = await validateChain(input)
  if (chainError) {
    redirect(`/novel/${input.id}/edit?error=${encodeURIComponent(chainError)}`)
  }

  // SNS通知の「下書き→公開」判定のため保存前のstatusを取得しておく
  // （前後リンクの付け替え掃除の判定にも旧値を使う）
  const current = await getNovel(input.id)
  const oldStatus = current?.status

  await updateNovel(input)
  const syncMessages = await syncChainPointers(input, neighbors, current)
  await purgeNovelCache()
  await notifyNovelPublishToSNS({ input, type: 'edit', oldStatus })

  revalidatePath('/novel')
  // 保存後は一覧へ戻らず、編集画面に留まる
  redirect(`/novel/${input.id}/edit?saved=1${chainInfoParam(syncMessages)}`)
}

// プレビューはページ遷移させず結果を useActionState で返す（遷移すると編集中の本文が消えるため）
export async function previewNovelAction(
  _prev: PreviewActionState,
  formData: FormData
): Promise<PreviewActionState> {
  const { input, error } = parseNovelForm(formData)
  if (error) {
    return { error }
  }

  // draftKeyは既定で維持し、チェックされたときのみ再生成する（プレビューURLの変更を任意にする）
  const regenerateKey = formData.get('regenerate_draft_key') === 'on'
  const draftKey = await saveNovelDraft(input, regenerateKey)
  const { env } = await getCloudflareContext({ async: true })
  return { previewURL: `${env.PAGES_HOST}/novels/${input.id}?draftKey=${draftKey}` }
}

// 編集画面からの手動キャッシュ削除。小説のキャッシュはプレフィックス単位（一覧・単体・本文まとめて）で削除する
export async function purgeNovelCacheAction(_prev: PurgeActionState, _formData: FormData): Promise<PurgeActionState> {
  try {
    await purgeNovelCache()
    return { done: '小説のキャッシュを削除しました（一覧・単体・本文すべて）' }
  } catch {
    return { error: 'キャッシュ削除に失敗しました' }
  }
}

export async function createNovelTagAction(formData: FormData): Promise<void> {
  const id = text(formData, 'id') || generateContentID()
  const tagName = text(formData, 'tag_name')

  if (tagName === '') {
    redirect(`/novel/tags?error=${encodeURIComponent('タグ名は必須です')}`)
  }
  if (!ID_PATTERN.test(id)) {
    redirect(`/novel/tags?error=${encodeURIComponent('IDは英数字・ハイフン・アンダースコアのみ使用できます')}`)
  }

  await createNovelTag({ id, tag_name: tagName })
  revalidatePath('/novel/tags')
  redirect('/novel/tags')
}

export async function createNovelSeriesAction(formData: FormData): Promise<void> {
  const id = text(formData, 'id') || generateContentID()
  const seriesName = text(formData, 'series_name')

  if (seriesName === '') {
    redirect(`/novel/series?error=${encodeURIComponent('シリーズ名は必須です')}`)
  }
  if (!ID_PATTERN.test(id)) {
    redirect(`/novel/series?error=${encodeURIComponent('IDは英数字・ハイフン・アンダースコアのみ使用できます')}`)
  }

  await createNovelSeries({ id, series_name: seriesName })
  revalidatePath('/novel/series')
  redirect('/novel/series')
}
