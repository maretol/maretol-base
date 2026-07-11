/**
 * KVプレビュー（draftKey互換）の blog ドラフト保存処理
 */
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { blogContentDraftRecord, blogContentRow } from 'api-types'
import { generateDraftKey } from './id'
import { getBlogContent, listBlogCategories } from './db_blog'
import type { BlogContentInput } from './db_blog'

const DRAFT_TTL_SECONDS = 3 * 24 * 60 * 60

export async function saveBlogContentDraft(input: BlogContentInput): Promise<string> {
  const { env } = await getCloudflareContext({ async: true })
  const now = new Date().toISOString()
  const current = await getBlogContent(input.id)

  const row: blogContentRow = {
    id: input.id,
    title: input.title,
    content: input.content,
    content_format: current?.content_format ?? 'markdown',
    ogp_image: input.ogp_image,
    sns_text: input.sns_text,
    is_secret: input.is_secret ? 1 : 0,
    secret_code: input.secret_code,
    status: input.status,
    created_at: current?.created_at ?? now,
    updated_at: now,
    published_at: current?.published_at ?? now,
    revised_at: now,
  }

  const allCategories = await listBlogCategories()
  const categories = input.categoryIDs
    .map((id) => allCategories.find((c) => c.id === id))
    .filter((c) => c !== undefined)

  const draftKey = generateDraftKey()
  const record: blogContentDraftRecord = { draftKey, row, categories }

  await env.CMS_DRAFT.put(`draft_blog_${input.id}`, JSON.stringify(record), {
    expirationTtl: DRAFT_TTL_SECONDS,
  })

  return draftKey
}
