'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  createBandeDessinee,
  updateBandeDessinee,
  getBandeDessinee,
  createComicTag,
  createComicSeries,
  type BandeDessineeInput,
} from '@/lib/db_comic'
import { purgeBandeDessineeCache } from '@/lib/cache'
import { saveBandeDessineeDraft } from '@/lib/draft_comic'
import { generateContentID } from '@/lib/id'
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

export async function createBandeDessineeAction(formData: FormData): Promise<void> {
  const { input, error } = parseComicForm(formData)
  if (error) {
    redirect(`/comic/new?error=${encodeURIComponent(error)}`)
  }
  if (await getBandeDessinee(input.id)) {
    redirect(`/comic/new?error=${encodeURIComponent(`ID '${input.id}' は既に使用されています`)}`)
  }

  await createBandeDessinee(input)
  await purgeBandeDessineeCache()

  revalidatePath('/comic')
  redirect('/comic')
}

export async function updateBandeDessineeAction(formData: FormData): Promise<void> {
  const { input, error } = parseComicForm(formData)
  if (error) {
    redirect(`/comic/${input.id}/edit?error=${encodeURIComponent(error)}`)
  }

  await updateBandeDessinee(input)
  await purgeBandeDessineeCache()

  revalidatePath('/comic')
  redirect('/comic')
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

  const draftKey = await saveBandeDessineeDraft(input)
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
