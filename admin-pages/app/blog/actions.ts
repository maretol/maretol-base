'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  createBlogContent,
  updateBlogContent,
  getBlogContent,
  createBlogCategory,
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
  redirect('/blog')
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
  redirect('/blog')
}

export async function previewBlogContentAction(formData: FormData): Promise<void> {
  const { input, error } = parseBlogForm(formData)
  const backTo = formData.get('mode') === 'new' ? '/blog/new' : `/blog/${input.id}/edit`
  if (error) {
    redirect(`${backTo}?error=${encodeURIComponent(error)}`)
  }

  const draftKey = await saveBlogContentDraft(input)
  const { env } = await getCloudflareContext({ async: true })
  const previewURL = `${env.PAGES_HOST}/blog/${input.id}?draftKey=${draftKey}`

  redirect(`${backTo}?preview=${encodeURIComponent(previewURL)}`)
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
  redirect('/blog/info')
}

export async function updateBlogInfoAction(formData: FormData): Promise<void> {
  const { input, error } = parseInfoForm(formData)
  if (error) {
    redirect(`/blog/info/${input.id}/edit?error=${encodeURIComponent(error)}`)
  }

  await updateBlogInfo(input)
  await purgeBlogMetaCache('info')

  revalidatePath('/blog/info')
  redirect('/blog/info')
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
