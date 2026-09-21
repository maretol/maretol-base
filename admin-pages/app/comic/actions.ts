'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  createBandeDessinee,
  updateBandeDessinee,
  getBandeDessinee,
  setBandeDessineeNextID,
  setBandeDessineePreviousID,
  createComicTag,
  createComicSeries,
  type BandeDessineeInput,
} from '@/lib/db_comic'
import type { bandeDessineeRow } from 'api-types'
import { purgeBandeDessineeCache } from '@/lib/cache'
import { saveBandeDessineeDraft } from '@/lib/draft_comic'
import { notifyComicPublishToSNS } from '@/lib/sns'
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

function parseComicForm(formData: FormData): { input: BandeDessineeInput; error?: string } {
  const id = text(formData, 'id') || generateContentID()
  const status = text(formData, 'status')

  // 発行日: date入力（YYYY-MM-DD）をJST 0時としてISO 8601 UTCに変換する（microCMSの日付ピッカーと同じ挙動）
  const publishDateRaw = text(formData, 'publish_date')
  const publishDate = publishDateRaw === '' ? null : new Date(`${publishDateRaw}T00:00:00+09:00`).toISOString()

  const firstLeftRight = text(formData, 'first_left_right') === 'right' ? 'right' : 'left'
  const format = text(formData, 'format')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '')

  const input: BandeDessineeInput = {
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
    back_cover: textOrNull(formData, 'back_cover'),
    format: format.length > 0 ? format : ['png'],
    filename: text(formData, 'filename'),
    first_page: parseInt(text(formData, 'first_page'), 10),
    last_page: parseInt(text(formData, 'last_page'), 10),
    first_left_right: [firstLeftRight],
    description: (formData.get('description') as string | null) ?? '',
    description_format: parseContentFormat(formData.get('description_format') as string | null),
    status: VALID_STATUS.includes(status as (typeof VALID_STATUS)[number])
      ? (status as BandeDessineeInput['status'])
      : 'DRAFT',
  }

  if (!ID_PATTERN.test(input.id)) {
    return { input, error: 'IDは英数字・ハイフン・アンダースコアのみ使用できます' }
  }
  if (input.title_name === '' || input.contents_url === '' || input.filename === '') {
    return { input, error: 'タイトル・コンテンツURL・ファイル名は必須です' }
  }
  if (input.tag_id === '') {
    return { input, error: 'タグを選択してください' }
  }
  if (Number.isNaN(input.first_page) || Number.isNaN(input.last_page)) {
    return { input, error: '開始・終了ページ番号は数値で入力してください' }
  }
  return { input }
}

type ChainNeighbors = { prev: bandeDessineeRow | null; next: bandeDessineeRow | null }

// チェーン制約の検証（issue #1155）: 前後の巻は必ず同一シリーズ内で完結する
// 検証で取得した隣接マンガの行は syncChainPointers で再利用する
async function validateChain(input: BandeDessineeInput): Promise<{ neighbors: ChainNeighbors; error?: string }> {
  const neighbors: ChainNeighbors = { prev: null, next: null }
  if (!input.previous_id && !input.next_id) {
    return { neighbors }
  }

  if (input.previous_id === input.id || input.next_id === input.id) {
    return { neighbors, error: '前の巻・次の巻に自分自身は指定できません' }
  }
  if (input.previous_id && input.previous_id === input.next_id) {
    return { neighbors, error: '前の巻と次の巻に同じマンガは指定できません' }
  }
  if (!input.series_id) {
    return { neighbors, error: '前の巻・次の巻を設定するにはシリーズの設定が必要です' }
  }
  if (input.previous_id) {
    neighbors.prev = await getBandeDessinee(input.previous_id)
    if (!neighbors.prev) {
      return { neighbors, error: `前の巻 '${input.previous_id}' が見つかりません` }
    }
    if (neighbors.prev.series_id !== input.series_id) {
      return { neighbors, error: `前の巻「${neighbors.prev.title_name}」が同じシリーズではありません` }
    }
  }
  if (input.next_id) {
    neighbors.next = await getBandeDessinee(input.next_id)
    if (!neighbors.next) {
      return { neighbors, error: `次の巻 '${input.next_id}' が見つかりません` }
    }
    if (neighbors.next.series_id !== input.series_id) {
      return { neighbors, error: `次の巻「${neighbors.next.title_name}」が同じシリーズではありません` }
    }
  }
  return { neighbors }
}

// 双方向リンクの自動同期（issue #1155）。本体保存後に呼ぶ
// - 新しい前後の巻の逆ポインタは無条件に上書きする（保存のたびに整合性が収束する）
// - 付け替え・解除で残った旧リンクは、相手がまだ自分を指している場合のみ解除する
// 実施内容はメッセージとして返し、保存後の画面で可視化する
async function syncChainPointers(
  input: BandeDessineeInput,
  neighbors: ChainNeighbors,
  current: bandeDessineeRow | null
): Promise<string[]> {
  const messages: string[] = []

  const oldPrevId = current?.previous_id ?? null
  if (oldPrevId && oldPrevId !== input.previous_id) {
    const oldPrev = await getBandeDessinee(oldPrevId)
    if (oldPrev?.next_id === input.id) {
      await setBandeDessineeNextID(oldPrevId, null)
      messages.push(`「${oldPrev.title_name}」の次の巻を解除しました`)
    }
  }
  const oldNextId = current?.next_id ?? null
  if (oldNextId && oldNextId !== input.next_id) {
    const oldNext = await getBandeDessinee(oldNextId)
    if (oldNext?.previous_id === input.id) {
      await setBandeDessineePreviousID(oldNextId, null)
      messages.push(`「${oldNext.title_name}」の前の巻を解除しました`)
    }
  }
  if (neighbors.prev && neighbors.prev.next_id !== input.id) {
    await setBandeDessineeNextID(neighbors.prev.id, input.id)
    messages.push(`「${neighbors.prev.title_name}」の次の巻をこのマンガに設定しました`)
  }
  if (neighbors.next && neighbors.next.previous_id !== input.id) {
    await setBandeDessineePreviousID(neighbors.next.id, input.id)
    messages.push(`「${neighbors.next.title_name}」の前の巻をこのマンガに設定しました`)
  }
  return messages
}

function chainInfoParam(messages: string[]): string {
  return messages.length > 0 ? `&info=${encodeURIComponent(messages.join(' / '))}` : ''
}

export async function createBandeDessineeAction(formData: FormData): Promise<void> {
  const { input, error } = parseComicForm(formData)
  if (error) {
    redirect(`/comic/new?error=${encodeURIComponent(error)}`)
  }
  if (await getBandeDessinee(input.id)) {
    redirect(`/comic/new?error=${encodeURIComponent(`ID '${input.id}' は既に使用されています`)}`)
  }
  const { neighbors, error: chainError } = await validateChain(input)
  if (chainError) {
    redirect(`/comic/new?error=${encodeURIComponent(chainError)}`)
  }

  await createBandeDessinee(input)
  const syncMessages = await syncChainPointers(input, neighbors, null)
  await purgeBandeDessineeCache()
  await notifyComicPublishToSNS({ input, type: 'new' })

  revalidatePath('/comic')
  // 保存後は一覧へ戻らず、作成したマンガの編集画面へ遷移する（連続編集のため）
  redirect(`/comic/${input.id}/edit?saved=1${chainInfoParam(syncMessages)}`)
}

export async function updateBandeDessineeAction(formData: FormData): Promise<void> {
  const { input, error } = parseComicForm(formData)
  if (error) {
    redirect(`/comic/${input.id}/edit?error=${encodeURIComponent(error)}`)
  }

  const { neighbors, error: chainError } = await validateChain(input)
  if (chainError) {
    redirect(`/comic/${input.id}/edit?error=${encodeURIComponent(chainError)}`)
  }

  // SNS通知の「下書き→公開」判定のため保存前のstatusを取得しておく
  // （前後リンクの付け替え掃除の判定にも旧値を使う）
  const current = await getBandeDessinee(input.id)
  const oldStatus = current?.status

  await updateBandeDessinee(input)
  const syncMessages = await syncChainPointers(input, neighbors, current)
  await purgeBandeDessineeCache()
  await notifyComicPublishToSNS({ input, type: 'edit', oldStatus })

  revalidatePath('/comic')
  // 保存後は一覧へ戻らず、編集画面に留まる
  redirect(`/comic/${input.id}/edit?saved=1${chainInfoParam(syncMessages)}`)
}

// プレビューはページ遷移させず結果を useActionState で返す（遷移すると編集中の本文が消えるため）
export async function previewBandeDessineeAction(
  _prev: PreviewActionState,
  formData: FormData
): Promise<PreviewActionState> {
  const { input, error } = parseComicForm(formData)
  if (error) {
    return { error }
  }

  // draftKeyは既定で維持し、チェックされたときのみ再生成する（プレビューURLの変更を任意にする）
  const regenerateKey = formData.get('regenerate_draft_key') === 'on'
  const draftKey = await saveBandeDessineeDraft(input, regenerateKey)
  const { env } = await getCloudflareContext({ async: true })
  return { previewURL: `${env.PAGES_HOST}/comics/${input.id}?draftKey=${draftKey}` }
}

// 編集画面からの手動キャッシュ削除。マンガのキャッシュはプレフィックス単位（一覧・単体まとめて）で削除する
export async function purgeBandeDessineeCacheAction(
  _prev: PurgeActionState,
  _formData: FormData
): Promise<PurgeActionState> {
  try {
    await purgeBandeDessineeCache()
    return { done: 'マンガのキャッシュを削除しました（一覧・単体すべて）' }
  } catch {
    return { error: 'キャッシュ削除に失敗しました' }
  }
}

export async function createComicTagAction(formData: FormData): Promise<void> {
  const id = text(formData, 'id') || generateContentID()
  const tagName = text(formData, 'tag_name')

  if (tagName === '') {
    redirect(`/comic/tags?error=${encodeURIComponent('タグ名は必須です')}`)
  }
  if (!ID_PATTERN.test(id)) {
    redirect(`/comic/tags?error=${encodeURIComponent('IDは英数字・ハイフン・アンダースコアのみ使用できます')}`)
  }

  await createComicTag({ id, tag_name: tagName })
  revalidatePath('/comic/tags')
  redirect('/comic/tags')
}

export async function createComicSeriesAction(formData: FormData): Promise<void> {
  const id = text(formData, 'id') || generateContentID()
  const seriesName = text(formData, 'series_name')

  if (seriesName === '') {
    redirect(`/comic/series?error=${encodeURIComponent('シリーズ名は必須です')}`)
  }
  if (!ID_PATTERN.test(id)) {
    redirect(`/comic/series?error=${encodeURIComponent('IDは英数字・ハイフン・アンダースコアのみ使用できます')}`)
  }

  await createComicSeries({ id, series_name: seriesName })
  revalidatePath('/comic/series')
  redirect('/comic/series')
}
