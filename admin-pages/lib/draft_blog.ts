/**
 * KVプレビュー（draftKey互換）の blog ドラフト保存処理
 */
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { blogContentDraftRecord, blogContentRow } from 'api-types'
import { generateDraftKey } from './id'
import { getBlogContent, listBlogCategories } from './db_blog'
import type { BlogContentInput } from './db_blog'

const DRAFT_TTL_SECONDS = 3 * 24 * 60 * 60

export async function saveBlogContentDraft(input: BlogContentInput, regenerateKey = false): Promise<string> {
  const { env } = await getCloudflareContext({ async: true })
  const now = new Date().toISOString()
  const current = await getBlogContent(input.id)
  const kvKey = `draft_blog_${input.id}`

  // 既存ドラフトのdraftKeyを維持する（共有済みのプレビューURLを変えないため）。再生成指定時のみ新しいキーにする
  let draftKey: string | null = null
  if (!regenerateKey) {
    const existing = await env.CMS_DRAFT.get<blogContentDraftRecord>(kvKey, 'json')
    draftKey = existing?.draftKey ?? null
  }
  draftKey ??= generateDraftKey()

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

  const record: blogContentDraftRecord = { draftKey, row, categories }

  await env.CMS_DRAFT.put(kvKey, JSON.stringify(record), {
    expirationTtl: DRAFT_TTL_SECONDS,
  })

  return draftKey
}
