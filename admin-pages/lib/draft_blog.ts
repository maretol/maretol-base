/**
 * KVプレビュー（draftKey互換）の blog ドラフト保存処理。TTL の規則は draft_kv.ts
 */
import type { blogContentDraftRecord, blogContentRow } from 'api-types'
import { listBlogCategories } from './db_blog'
import type { BlogContentInput } from './db_blog'
import type { DraftSyncResult } from './form-state'
import {
  deleteDraft,
  getDraftKey,
  previewURL,
  publicURL,
  putDraft,
  resolveDraftKey,
  type DraftWriteOptions,
} from './draft_kv'

const kvKey = (id: string) => `draft_blog_${id}`
const pagePath = (id: string) => `/blog/${id}`

// current は D1 の保存前の行（新規は null）。作成日時・初公開日時をプレビューに引き継ぐ
export async function saveBlogContentDraft(
  input: BlogContentInput,
  current: blogContentRow | null,
  { regenerateKey, persistent }: DraftWriteOptions
): Promise<{ draftKey: string; previewURL: string }> {
  const now = new Date().toISOString()
  // draftKey の解決とカテゴリの読み取りは独立しているので並行する
  const [draftKey, allCategories] = await Promise.all([
    resolveDraftKey(kvKey(input.id), regenerateKey),
    listBlogCategories(),
  ])

  const row: blogContentRow = {
    id: input.id,
    title: input.title,
    content: input.content,
    // フォームで選択された形式でプレビューする（形式変更もプレビューで確認できるようにする）
    content_format: input.content_format,
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

  const categories = input.categoryIDs
    .map((id) => allCategories.find((c) => c.id === id))
    .filter((c) => c !== undefined)

  const record: blogContentDraftRecord = { draftKey, row, categories }
  await putDraft(kvKey(input.id), record, persistent)
  return { draftKey, previewURL: await previewURL(pagePath(input.id), draftKey) }
}

export async function deleteBlogContentDraft(id: string): Promise<void> {
  await deleteDraft(kvKey(id))
}

// 編集ページで、すでに発行済みのプレビュー URL を表示するために読む。無ければ null
export async function getBlogContentDraftPreviewURL(id: string): Promise<string | null> {
  const draftKey = await getDraftKey(kvKey(id))
  return draftKey === null ? null : await previewURL(pagePath(id), draftKey)
}

// D1 への保存後に KV を同期する。下書き（PUBLISH 以外）なら同じ内容で TTL なしに書いてプレビュー URL を返し、
// 公開なら古いプレビューを消して公開 URL を返す（#1404）
export async function syncBlogContentDraftAfterSave(
  input: BlogContentInput,
  current: blogContentRow | null
): Promise<DraftSyncResult> {
  if (input.status === 'PUBLISH') {
    await deleteBlogContentDraft(input.id)
    return { publicURL: await publicURL(pagePath(input.id)) }
  }
  const { previewURL } = await saveBlogContentDraft(input, current, { regenerateKey: false, persistent: true })
  return { previewURL }
}
