/**
 * KVプレビュー（draftKey互換）の blog ドラフト。TTL などの規則は draft_kv.ts
 */
import type { blogContentDraftRecord, blogContentRow } from 'api-types'
import { listBlogCategories } from './db_blog'
import type { BlogContentInput } from './db_blog'
import { draftChannel, type DraftRecordBase } from './draft_kv'

export const blogDraft = draftChannel<
  BlogContentInput,
  blogContentRow,
  Omit<blogContentDraftRecord, keyof DraftRecordBase>
>({
  kvPrefix: 'draft_blog_',
  pagePath: (id) => `/blog/${id}`,
  // current は D1 の保存前の行（新規は null）。作成日時・初公開日時をプレビューに引き継ぐ
  buildRecord: async (input, current) => {
    const now = new Date().toISOString()
    const allCategories = await listBlogCategories()

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

    return { row, categories }
  },
})
