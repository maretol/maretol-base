'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
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
import { createdURL } from '@/lib/purge_result'
import { comicDraft } from '@/lib/draft_comic'
import { notifyComicPublishToSNS } from '@/lib/sns'
import { generateContentID } from '@/lib/id'
import { parseContentFormat } from '@/lib/content-format'
import { parseStatus, statusTransitionError } from '@/lib/status'
import { errorMessage, saveFailed, draftSyncFailed, previewFailed } from '@/lib/save-error'
import type { PreviewActionState, PurgeActionState, SaveActionState } from '@/lib/form-state'
import { text, textOrNull } from '@/lib/form-data'

const ID_PATTERN = /^[a-zA-Z0-9_-]+$/
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

// 発行日: date 入力（YYYY-MM-DD）を JST 0 時として ISO 8601 UTC に変換する（microCMS の日付ピッカーと同じ挙動）。
// 入力を UTC の日付として組み立て直し、YYYY-MM-DD に戻して入力と一致するかで、形式と暦の両方を確かめる（issue #1312）。
// 桁数だけを見ると、暦に無い 2024-02-31 を Date が 03-01 に繰り上げて受理してしまう
function parsePublishDate(raw: string): { value: string | null; error?: string } {
  if (raw === '') {
    return { value: null }
  }
  const [year, month, day] = raw.split('-').map(Number)
  const utcDate = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(utcDate.getTime()) || utcDate.toISOString().slice(0, 10) !== raw) {
    return { value: null, error: '発行日は YYYY-MM-DD 形式の実在する日付で入力してください' }
  }
  return { value: new Date(utcDate.getTime() - JST_OFFSET_MS).toISOString() }
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

type ChainSyncResult = { messages: string[]; error?: string }

// 双方向リンクの自動同期（issue #1155）。本体保存後に呼ぶ
// - 新しい前後の巻の逆ポインタは無条件に上書きする（保存のたびに整合性が収束する）
// - 付け替え・解除で残った旧リンクは、相手がまだ自分を指している場合のみ解除する
// 実施内容はメッセージとして返し、保存後の画面で可視化する。本体はもう保存できているので、途中で失敗しても
// 例外にはせず、そこまでの実施内容と失敗の内容を返す（呼び出し側が警告にする）
async function syncChainPointers(
  input: BandeDessineeInput,
  neighbors: ChainNeighbors,
  current: bandeDessineeRow | null
): Promise<ChainSyncResult> {
  const messages: string[] = []
  try {
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
  } catch (e) {
    console.error('chain sync error:', e)
    return { messages, error: errorMessage(e) }
  }
  return { messages }
}

// 保存に付随する処理の報告・警告（前後巻の付け替え・KV の同期）を 1 行にまとめる。無ければ undefined
function joinMessages(messages: (string | undefined)[]): string | undefined {
  const present = messages.filter((m): m is string => m !== undefined)
  return present.length > 0 ? present.join(' / ') : undefined
}

// 前後巻の付け替えの失敗は保存の失敗にしない（本体は書き込み済み）。警告で知らせ、相手側の巻を開いて直してもらう
function chainWarning(sync: ChainSyncResult): string | undefined {
  if (sync.error === undefined) {
    return undefined
  }
  return `前後の巻の自動設定に失敗しました。前の巻・次の巻を開いて設定を確認してください: ${sync.error}`
}

// 新規作成。エラーは state で返して入力を保持し、成功したら作成したマンガの編集画面へ遷移する（URL が変わるため）
export async function createBandeDessineeAction(_prev: SaveActionState, formData: FormData): Promise<SaveActionState> {
  const { input, error } = parseComicForm(formData)
  if (error) {
    return { error }
  }
  // D1 の例外（ID の重複確認・前後巻の検証も含む）は state のエラーにして入力を保持する（issue #1311）
  let neighbors: ChainNeighbors
  try {
    if (await getBandeDessinee(input.id)) {
      return { error: `ID '${input.id}' は既に使用されています` }
    }
    const chain = await validateChain(input)
    if (chain.error) {
      return { error: chain.error }
    }
    neighbors = chain.neighbors
    await createBandeDessinee(input)
  } catch (e) {
    return saveFailed(e)
  }
  // 本体は保存できたので、ここから先の失敗は保存の失敗にしない（前後巻の付け替えと KV の同期は警告、パージは案内、SNS は記録だけ）。
  // パージは前後巻の付け替えが終わってから行う（相手側の詳細も一覧のタグで一緒に消える）。KV の同期・SNS 通知は独立なので並行する
  const sync = await syncChainPointers(input, neighbors, null)
  const [purged, draft] = await Promise.all([
    purgeBandeDessineeCache(input.id),
    comicDraft.syncAfterSave(input, null).catch(draftSyncFailed),
    notifyComicPublishToSNS({ input, current: null }),
  ])

  revalidatePath('/comic')
  redirect(
    createdURL(`/comic/${input.id}/edit`, {
      purged,
      info: joinMessages(sync.messages),
      warning: joinMessages([chainWarning(sync), draft.warning]),
    })
  )
}

// 更新。ページ遷移させず結果を state で返す（遷移すると編集中の内容が消えるため）
export async function updateBandeDessineeAction(_prev: SaveActionState, formData: FormData): Promise<SaveActionState> {
  const { input, error } = parseComicForm(formData)
  if (error) {
    return { error }
  }
  // D1 の例外（保存前の行の読み取り・前後巻の検証も含む）は state のエラーにして入力を保持する（issue #1311）
  let current: bandeDessineeRow
  let neighbors: ChainNeighbors
  try {
    // 保存前の行は status の遷移判定・前後リンクの付け替え掃除・SNS 通知の判定に使う
    const [row, chain] = await Promise.all([getBandeDessinee(input.id), validateChain(input)])
    if (!row) {
      return { error: `マンガ '${input.id}' が見つかりません` }
    }
    if (chain.error) {
      return { error: chain.error }
    }
    const transitionError = statusTransitionError(row.status, input.status)
    if (transitionError) {
      return { error: transitionError }
    }
    await updateBandeDessinee(input, row)
    current = row
    neighbors = chain.neighbors
  } catch (e) {
    return saveFailed(e)
  }
  // 本体は保存できたので、ここから先の失敗は保存の失敗にしない（前後巻の付け替えと KV の同期は警告、パージは案内、SNS は記録だけ）。
  // パージは前後巻の付け替えが終わってから行う。KV の同期（下書きならプレビューを更新、公開なら削除）・SNS 通知は独立なので並行する
  const sync = await syncChainPointers(input, neighbors, current)
  const [purged, urls] = await Promise.all([
    purgeBandeDessineeCache(input.id),
    comicDraft.syncAfterSave(input, current).catch(draftSyncFailed),
    notifyComicPublishToSNS({ input, current }),
  ])

  revalidatePath('/comic')
  return {
    saved: true,
    info: joinMessages(sync.messages),
    purgeFailed: !purged,
    ...urls,
    warning: joinMessages([chainWarning(sync), urls.warning]),
  }
}

// プレビュー URL の発行。編集中の内容を KV にだけ書く（D1 には保存しない）。
// ページ遷移させず結果を useActionState で返す（遷移すると編集中の本文が消えるため）
export async function previewBandeDessineeAction(
  _prev: PreviewActionState,
  formData: FormData
): Promise<PreviewActionState> {
  const idGiven = text(formData, 'id') !== ''
  const { input, error } = parseComicForm(formData)
  if (error) {
    return { error }
  }

  // 保存前の行の読み取り（D1）と KV の書き込みの例外は state のエラーにし、Next のエラー画面で入力が消えないようにする
  try {
    const current = await getBandeDessinee(input.id)
    const { previewURL, persistent } = await comicDraft.issuePreview(input, current)
    return { previewURL, persistent, generatedID: idGiven ? undefined : input.id }
  } catch (e) {
    return previewFailed(e)
  }
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
