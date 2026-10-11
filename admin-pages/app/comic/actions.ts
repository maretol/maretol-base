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
import { withPurgeResult } from '@/lib/purge_result'
import { saveBandeDessineeDraft } from '@/lib/draft_comic'
import { notifyComicPublishToSNS } from '@/lib/sns'
import { generateContentID } from '@/lib/id'
import { parseContentFormat } from '@/lib/content-format'
import { parseStatus, statusTransitionError } from '@/lib/status'
import { saveFailed } from '@/lib/save-error'
import type { PreviewActionState, PurgeActionState, SaveActionState } from '@/lib/form-state'
import { text, textOrNull } from '@/lib/form-data'

const ID_PATTERN = /^[a-zA-Z0-9_-]+$/

// 発行日: date入力（YYYY-MM-DD）をJST 0時としてISO 8601 UTCに変換する（microCMSの日付ピッカーと同じ挙動）
// 形式が崩れた入力で new Date(...).toISOString() が RangeError を投げないよう、先に形式を確かめる（issue #1312）
function parsePublishDate(raw: string): { value: string | null; error?: string } {
  if (raw === '') {
    return { value: null }
  }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00+09:00`) : null
  if (date === null || Number.isNaN(date.getTime())) {
    return { value: null, error: '発行日は YYYY-MM-DD 形式の日付で入力してください' }
  }
  return { value: date.toISOString() }
}

function parseComicForm(formData: FormData): { input: BandeDessineeInput; error?: string } {
  const id = text(formData, 'id') || generateContentID()
  const publishDate = parsePublishDate(text(formData, 'publish_date'))

  const firstLeftRight = text(formData, 'first_left_right') === 'right' ? 'right' : 'left'
  const format = text(formData, 'format')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '')

  const input: BandeDessineeInput = {
    id,
    title_name: text(formData, 'title_name'),
    publish_date: publishDate.value,
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
    status: parseStatus(text(formData, 'status')),
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
  if (publishDate.error) {
    return { input, error: publishDate.error }
  }
  if (Number.isNaN(input.first_page) || Number.isNaN(input.last_page)) {
    return { input, error: '開始・終了ページ番号は数値で入力してください' }
  }
  if (input.first_page < 0 || input.first_page > input.last_page) {
    return { input, error: '開始ページ番号は 0 以上で、終了ページ番号以下にしてください' }
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
  // 前後の巻は互いに独立なので並行して読む
  const [prev, next] = await Promise.all([
    input.previous_id ? getBandeDessinee(input.previous_id) : null,
    input.next_id ? getBandeDessinee(input.next_id) : null,
  ])
  if (input.previous_id) {
    if (!prev) {
      return { neighbors, error: `前の巻 '${input.previous_id}' が見つかりません` }
    }
    if (prev.series_id !== input.series_id) {
      return { neighbors, error: `前の巻「${prev.title_name}」が同じシリーズではありません` }
    }
    neighbors.prev = prev
  }
  if (input.next_id) {
    if (!next) {
      return { neighbors, error: `次の巻 '${input.next_id}' が見つかりません` }
    }
    if (next.series_id !== input.series_id) {
      return { neighbors, error: `次の巻「${next.title_name}」が同じシリーズではありません` }
    }
    neighbors.next = next
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

function joinInfo(messages: string[]): string | undefined {
  return messages.length > 0 ? messages.join(' / ') : undefined
}

// 新規作成後の遷移先。チェーン同期の報告とパージの結果は遷移先の画面で知らせる
function createdURL(comicID: string, syncMessages: string[], purged: boolean): string {
  const info = joinInfo(syncMessages)
  const url = `/comic/${comicID}/edit?saved=1${info ? `&info=${encodeURIComponent(info)}` : ''}`
  return withPurgeResult(url, purged)
}

// 新規作成。エラーは state で返して入力を保持し、成功したら作成したマンガの編集画面へ遷移する（URL が変わるため）
export async function createBandeDessineeAction(_prev: SaveActionState, formData: FormData): Promise<SaveActionState> {
  const { input, error } = parseComicForm(formData)
  if (error) {
    return { error }
  }
  if (await getBandeDessinee(input.id)) {
    return { error: `ID '${input.id}' は既に使用されています` }
  }
  const { neighbors, error: chainError } = await validateChain(input)
  if (chainError) {
    return { error: chainError }
  }

  let syncMessages: string[]
  try {
    await createBandeDessinee(input)
    syncMessages = await syncChainPointers(input, neighbors, null)
  } catch (e) {
    return saveFailed(e)
  }
  const purged = await purgeBandeDessineeCache(input.id)
  await notifyComicPublishToSNS({ input, previouslyPublished: false })

  revalidatePath('/comic')
  redirect(createdURL(input.id, syncMessages, purged))
}

// 更新。ページ遷移させず結果を state で返す（遷移すると編集中の内容が消えるため）
export async function updateBandeDessineeAction(_prev: SaveActionState, formData: FormData): Promise<SaveActionState> {
  const { input, error } = parseComicForm(formData)
  if (error) {
    return { error }
  }
  // 保存前の行は status の遷移判定・前後リンクの付け替え掃除・SNS 通知の判定に使う
  const [current, chain] = await Promise.all([getBandeDessinee(input.id), validateChain(input)])
  if (!current) {
    return { error: `マンガ '${input.id}' が見つかりません` }
  }
  if (chain.error) {
    return { error: chain.error }
  }
  const transitionError = statusTransitionError(current, input.status)
  if (transitionError) {
    return { error: transitionError }
  }

  let syncMessages: string[]
  try {
    await updateBandeDessinee(input, current)
    syncMessages = await syncChainPointers(input, chain.neighbors, current)
  } catch (e) {
    return saveFailed(e)
  }
  const purged = await purgeBandeDessineeCache(input.id)
  await notifyComicPublishToSNS({ input, previouslyPublished: current.published_at !== null })

  revalidatePath('/comic')
  return { saved: true, info: joinInfo(syncMessages), purgeFailed: !purged }
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

// 編集画面からの手動キャッシュ削除。マンガの詳細も一覧のタグを持つので、一覧・単体まとめて削除される
export async function purgeBandeDessineeCacheAction(
  _prev: PurgeActionState,
  formData: FormData
): Promise<PurgeActionState> {
  const id = text(formData, 'id')
  if (id === '') {
    return { error: 'IDが不正です' }
  }
  try {
    if (!(await purgeBandeDessineeCache(id))) {
      return { error: '公開サイトのキャッシュ削除に失敗しました。時間をおいて再度実行してください' }
    }
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
