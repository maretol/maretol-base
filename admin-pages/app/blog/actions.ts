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
import { saveBlogContentDraft } from '@/lib/draft_blog'
import { notifyBlogPublishToSNS } from '@/lib/sns'
import { generateContentID } from '@/lib/id'
import { parseContentFormat } from '@/lib/content-format'
import type { PreviewActionState, PurgeActionState, AddCategoryState } from '@/lib/form-state'

const VALID_STATUS = ['PUBLISH', 'DRAFT', 'CLOSED'] as const
const ID_PATTERN = /^[a-zA-Z0-9_-]+$/

function text(formData: FormData, name: string): string {
  return ((formData.get(name) as string | null) ?? '').trim()
}

function textOrNull(formData: FormData, name: string): string | null {
  const v = text(formData, name)
  return v === '' ? null : v
}

function parseStatus(formData: FormData): BlogContentInput['status'] {
  const status = text(formData, 'status')
  return VALID_STATUS.includes(status as (typeof VALID_STATUS)[number])
    ? (status as BlogContentInput['status'])
    : 'DRAFT'
}

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
    status: parseStatus(formData),
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

export async function createBlogContentAction(formData: FormData): Promise<void> {
  const { input, error } = parseBlogForm(formData)
  if (error) {
    redirect(`/blog/new?error=${encodeURIComponent(error)}`)
  }
  if (await getBlogContent(input.id)) {
    redirect(`/blog/new?error=${encodeURIComponent(`ID '${input.id}' は既に使用されています`)}`)
  }

  await createBlogContent(input)
  await purgeBlogContentCache(input.id)
  await notifyBlogPublishToSNS({ input, type: 'new' })

  revalidatePath('/blog')
  // 保存後は一覧へ戻らず、作成した記事の編集画面へ遷移する（連続編集のため）
  redirect(`/blog/${input.id}/edit?saved=1`)
}

export async function updateBlogContentAction(formData: FormData): Promise<void> {
  const { input, error } = parseBlogForm(formData)
  if (error) {
    redirect(`/blog/${input.id}/edit?error=${encodeURIComponent(error)}`)
  }

  // SNS通知の「下書き→公開」判定のため保存前のstatusを取得しておく
  const current = await getBlogContent(input.id)
  const oldStatus = current?.status

  await updateBlogContent(input)
  await purgeBlogContentCache(input.id)
  await notifyBlogPublishToSNS({ input, type: 'edit', oldStatus })

  revalidatePath('/blog')
  // 保存後は一覧へ戻らず、編集画面に留まる
  redirect(`/blog/${input.id}/edit?saved=1`)
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
    await purgeBlogContentCache(id)
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
  await purgeBlogMetaCache('tags')

  revalidatePath('/blog/categories')
  redirect('/blog/categories')
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
  await purgeBlogMetaCache('tags')

  revalidatePath('/blog/categories')
  return { categories: [...prev.categories, { id, name }] }
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
  await purgeBlogMetaCache('tags')

  revalidatePath('/blog/categories')
  redirect('/blog/categories')
}

function parseInfoForm(formData: FormData): { input: BlogInfoInput; error?: string } {
  const id = text(formData, 'id') || generateContentID()
  const input: BlogInfoInput = {
    id,
    page_pathname: text(formData, 'page_pathname'),
    title: textOrNull(formData, 'title'),
    main_text: (formData.get('main_text') as string | null) ?? '',
    main_text_format: parseContentFormat(formData.get('main_text_format') as string | null),
    status: parseStatus(formData),
  }
  if (!ID_PATTERN.test(input.id)) {
    return { input, error: 'IDは英数字・ハイフン・アンダースコアのみ使用できます' }
  }
  if (input.page_pathname === '' || !input.page_pathname.startsWith('/')) {
    return { input, error: 'ページパス（/ 始まり）は必須です' }
  }
  return { input }
}

export async function createBlogInfoAction(formData: FormData): Promise<void> {
  const { input, error } = parseInfoForm(formData)
  if (error) {
    redirect(`/blog/info/new?error=${encodeURIComponent(error)}`)
  }
  if (await getBlogInfo(input.id)) {
    redirect(`/blog/info/new?error=${encodeURIComponent(`ID '${input.id}' は既に使用されています`)}`)
  }

  await createBlogInfo(input)
  await purgeBlogMetaCache('info')

  revalidatePath('/blog/info')
  // 保存後は一覧へ戻らず、作成したページの編集画面へ遷移する
  redirect(`/blog/info/${input.id}/edit?saved=1`)
}

export async function updateBlogInfoAction(formData: FormData): Promise<void> {
  const { input, error } = parseInfoForm(formData)
  if (error) {
    redirect(`/blog/info/${input.id}/edit?error=${encodeURIComponent(error)}`)
  }

  await updateBlogInfo(input)
  await purgeBlogMetaCache('info')

  revalidatePath('/blog/info')
  // 保存後は一覧へ戻らず、編集画面に留まる
  redirect(`/blog/info/${input.id}/edit?saved=1`)
}

export async function updateBlogStaticAction(formData: FormData): Promise<void> {
  const key = text(formData, 'key')
  const value = (formData.get('value') as string | null) ?? ''
  if (key === '') {
    redirect(`/blog/static?error=${encodeURIComponent('キーが不正です')}`)
  }

  await upsertBlogStatic(key, value)
  await purgeBlogMetaCache('static')

  revalidatePath('/blog/static')
  redirect('/blog/static')
}
