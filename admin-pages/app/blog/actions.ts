'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  createBlogContent,
  updateBlogContent,
  getBlogContent,
  createBlogCategory,
  listBlogCategories,
  updateBlogCategoryOrders,
  createBlogInfo,
  updateBlogInfo,
  getBlogInfo,
  upsertBlogStatic,
  type BlogContentInput,
  type BlogInfoInput,
} from '@/lib/db_blog'
import { purgeBlogContentCache, purgeBlogMetaCache } from '@/lib/cache'
import { withPurgeResult } from '@/lib/purge_result'
import { saveBlogContentDraft } from '@/lib/draft_blog'
import { notifyBlogPublishToSNS } from '@/lib/sns'
import { generateContentID } from '@/lib/id'
import { parseContentFormat } from '@/lib/content-format'
import { parseStatus, statusTransitionError } from '@/lib/status'
import { saveFailed } from '@/lib/save-error'
import type { PreviewActionState, PurgeActionState, AddCategoryState, SaveActionState } from '@/lib/form-state'
import { text, textOrNull } from '@/lib/form-data'

const ID_PATTERN = /^[a-zA-Z0-9_-]+$/

function parseBlogForm(formData: FormData): { input: BlogContentInput; error?: string } {
  const id = text(formData, 'id') || generateContentID()
  const input: BlogContentInput = {
    id,
    title: text(formData, 'title'),
    content: (formData.get('content') as string | null) ?? '',
    content_format: parseContentFormat(formData.get('content_format') as string | null),
    ogp_image: textOrNull(formData, 'ogp_image'),
    sns_text: textOrNull(formData, 'sns_text'),
    is_secret: formData.get('is_secret') === 'on',
    secret_code: textOrNull(formData, 'secret_code'),
    status: parseStatus(text(formData, 'status')),
    categoryIDs: formData.getAll('category_ids').map((v) => String(v)),
  }

  if (!ID_PATTERN.test(input.id)) {
    return { input, error: 'IDは英数字・ハイフン・アンダースコアのみ使用できます' }
  }
  if (input.title === '') {
    return { input, error: 'タイトルは必須です' }
  }
  if (input.is_secret && (input.secret_code === null || input.secret_code === '')) {
    return { input, error: '限定公開にする場合はシークレットコードを設定してください' }
  }
  return { input }
}

// 新規作成後の遷移先。公開サイトのキャッシュ削除に失敗しても保存は成立させ、遷移先の画面で知らせる
function createdURL(articleID: string, purged: boolean): string {
  return withPurgeResult(`/blog/${articleID}/edit?saved=1`, purged)
}

// 新規作成。エラーは state で返して入力を保持し、成功したら作成した記事の編集画面へ遷移する（URL が変わるため）
export async function createBlogContentAction(_prev: SaveActionState, formData: FormData): Promise<SaveActionState> {
  const { input, error } = parseBlogForm(formData)
  if (error) {
    return { error }
  }
  if (await getBlogContent(input.id)) {
    return { error: `ID '${input.id}' は既に使用されています` }
  }

  try {
    await createBlogContent(input)
  } catch (e) {
    return saveFailed(e)
  }
  const purged = await purgeBlogContentCache(input.id)
  await notifyBlogPublishToSNS({ input, previouslyPublished: false })

  revalidatePath('/blog')
  redirect(createdURL(input.id, purged))
}

// 更新。ページ遷移させず結果を state で返す（遷移すると編集中の本文が消えるため）
export async function updateBlogContentAction(_prev: SaveActionState, formData: FormData): Promise<SaveActionState> {
  const { input, error } = parseBlogForm(formData)
  if (error) {
    return { error }
  }
  const current = await getBlogContent(input.id)
  if (!current) {
    return { error: `記事 '${input.id}' が見つかりません` }
  }
  const transitionError = statusTransitionError(current, input.status)
  if (transitionError) {
    return { error: transitionError }
  }

  try {
    await updateBlogContent(input, current)
  } catch (e) {
    return saveFailed(e)
  }
  const purged = await purgeBlogContentCache(input.id)
  await notifyBlogPublishToSNS({ input, previouslyPublished: current.published_at !== null })

  revalidatePath('/blog')
  return { saved: true, purgeFailed: !purged }
}

// プレビューはページ遷移させず結果を useActionState で返す（遷移すると編集中の本文が消えるため）
export async function previewBlogContentAction(
  _prev: PreviewActionState,
  formData: FormData
): Promise<PreviewActionState> {
  const { input, error } = parseBlogForm(formData)
  if (error) {
    return { error }
  }

  // draftKeyは既定で維持し、チェックされたときのみ再生成する（プレビューURLの変更を任意にする）
  const regenerateKey = formData.get('regenerate_draft_key') === 'on'
  const draftKey = await saveBlogContentDraft(input, regenerateKey)
  const { env } = await getCloudflareContext({ async: true })
  return { previewURL: `${env.PAGES_HOST}/blog/${input.id}?draftKey=${draftKey}` }
}

// 編集画面からの手動キャッシュ削除。編集中の本文を失わないようページ遷移させない
export async function purgeBlogContentCacheAction(
  _prev: PurgeActionState,
  formData: FormData
): Promise<PurgeActionState> {
  const id = text(formData, 'id')
  if (id === '') {
    return { error: 'IDが不正です' }
  }
  try {
    if (!(await purgeBlogContentCache(id))) {
      return { error: '公開サイトのキャッシュ削除に失敗しました。時間をおいて再度実行してください' }
    }
    return { done: 'この記事のキャッシュを削除しました（一覧・記事単体）' }
  } catch {
    return { error: 'キャッシュ削除に失敗しました' }
  }
}

// カテゴリ表示順の一括更新（order_{id} = 数値 のフォーム値を反映）
export async function updateBlogCategoryOrderAction(formData: FormData): Promise<void> {
  const orders: { id: string; sort_order: number }[] = []
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('order_')) {
      continue
    }
    const sortOrder = parseInt(String(value), 10)
    if (Number.isNaN(sortOrder)) {
      redirect(`/blog/categories?error=${encodeURIComponent('表示順は数値で入力してください')}`)
    }
    orders.push({ id: key.slice('order_'.length), sort_order: sortOrder })
  }

  await updateBlogCategoryOrders(orders)
  const purged = await purgeBlogMetaCache('tags')

  revalidatePath('/blog/categories')
  redirect(withPurgeResult('/blog/categories', purged))
}

// 記事編集画面からのカテゴリ追加。編集中の本文を失わないようページ遷移させず、
// 追加したカテゴリを累積して返す（フォーム側でチェックボックスに反映する）
export async function addBlogCategoryInlineAction(
  prev: AddCategoryState,
  formData: FormData
): Promise<AddCategoryState> {
  const name = text(formData, 'new_category_name')
  if (name === '') {
    return { ...prev, error: 'カテゴリ名は必須です' }
  }

  const existing = await listBlogCategories()
  if (existing.some((c) => c.name === name)) {
    return { ...prev, error: `カテゴリ '${name}' は既に存在します` }
  }

  const id = generateContentID()
  await createBlogCategory({ id, name })
  const purged = await purgeBlogMetaCache('tags')

  revalidatePath('/blog/categories')
  return {
    categories: [...prev.categories, { id, name }],
    purgeFailed: !purged,
  }
}

export async function createBlogCategoryAction(formData: FormData): Promise<void> {
  const id = text(formData, 'id') || generateContentID()
  const name = text(formData, 'name')

  if (name === '') {
    redirect(`/blog/categories?error=${encodeURIComponent('カテゴリ名は必須です')}`)
  }
  if (!ID_PATTERN.test(id)) {
    redirect(`/blog/categories?error=${encodeURIComponent('IDは英数字・ハイフン・アンダースコアのみ使用できます')}`)
  }

  await createBlogCategory({ id, name })
  const purged = await purgeBlogMetaCache('tags')

  revalidatePath('/blog/categories')
  redirect(withPurgeResult('/blog/categories', purged))
}

function parseInfoForm(formData: FormData): { input: BlogInfoInput; error?: string } {
  const id = text(formData, 'id') || generateContentID()
  const input: BlogInfoInput = {
    id,
    page_pathname: text(formData, 'page_pathname'),
    title: textOrNull(formData, 'title'),
    main_text: (formData.get('main_text') as string | null) ?? '',
    main_text_format: parseContentFormat(formData.get('main_text_format') as string | null),
    status: parseStatus(text(formData, 'status')),
  }
  if (!ID_PATTERN.test(input.id)) {
    return { input, error: 'IDは英数字・ハイフン・アンダースコアのみ使用できます' }
  }
  if (input.page_pathname === '' || !input.page_pathname.startsWith('/')) {
    return { input, error: 'ページパス（/ 始まり）は必須です' }
  }
  return { input }
}

// 固定ページの新規作成。記事と同じく、エラーは state で返し、成功したら編集画面へ遷移する
export async function createBlogInfoAction(_prev: SaveActionState, formData: FormData): Promise<SaveActionState> {
  const { input, error } = parseInfoForm(formData)
  if (error) {
    return { error }
  }
  if (await getBlogInfo(input.id)) {
    return { error: `ID '${input.id}' は既に使用されています` }
  }

  try {
    await createBlogInfo(input)
  } catch (e) {
    return saveFailed(e)
  }
  const purged = await purgeBlogMetaCache('info')

  revalidatePath('/blog/info')
  redirect(withPurgeResult(`/blog/info/${input.id}/edit?saved=1`, purged))
}

export async function updateBlogInfoAction(_prev: SaveActionState, formData: FormData): Promise<SaveActionState> {
  const { input, error } = parseInfoForm(formData)
  if (error) {
    return { error }
  }
  const current = await getBlogInfo(input.id)
  if (!current) {
    return { error: `固定ページ '${input.id}' が見つかりません` }
  }
  const transitionError = statusTransitionError(current, input.status)
  if (transitionError) {
    return { error: transitionError }
  }

  try {
    await updateBlogInfo(input, current)
  } catch (e) {
    return saveFailed(e)
  }
  const purged = await purgeBlogMetaCache('info')

  revalidatePath('/blog/info')
  return { saved: true, purgeFailed: !purged }
}

export async function updateBlogStaticAction(formData: FormData): Promise<void> {
  const key = text(formData, 'key')
  const value = (formData.get('value') as string | null) ?? ''
  if (key === '') {
    redirect(`/blog/static?error=${encodeURIComponent('キーが不正です')}`)
  }

  await upsertBlogStatic(key, value)
  const purged = await purgeBlogMetaCache('static')

  revalidatePath('/blog/static')
  redirect(withPurgeResult('/blog/static', purged))
}
