/**
 * KVプレビュー（draftKey互換）の illust ドラフト。編集中の内容を D1 レコードと同一形状で CMS_DRAFT に書き込み、
 * cms-data-fetcher が draftKey 付きリクエストで参照する（cms_goal.md 参照）。TTL などの規則は draft_kv.ts
 */
import type { atelierDraftRecord, atelierRow } from 'api-types'
import { listTags } from './db'
import type { AtelierInput } from './db'
import { draftChannel, type DraftRecordBase } from './draft_kv'

export const atelierDraft = draftChannel<AtelierInput, atelierRow, Omit<atelierDraftRecord, keyof DraftRecordBase>>({
  kvPrefix: 'draft_atelier_',
  pagePath: (id) => `/illust/detail/${id}`,
  // current は D1 の保存前の行（新規は null）。作成日時・初公開日時をプレビューに引き継ぐ
  buildRecord: async (input, current) => {
    const now = new Date().toISOString()
    const allTags = await listTags()

    const row: atelierRow = {
      id: input.id,
      title: input.title,
      src: input.src,
      object_position: input.object_position,
      description: input.description,
      // フォームで選択された形式でプレビューする（形式変更もプレビューで確認できるようにする）
      description_format: input.description_format,
      status: input.status,
      created_at: current?.created_at ?? now,
      updated_at: now,
      published_at: current?.published_at ?? now,
      revised_at: now,
    }

    // 配信時のタグ表示に必要な情報を埋め込む（fetcher側でのJOINを不要にする）
    const tags = input.tagIDs
      .map((id) => allTags.find((t) => t.id === id))
      .filter((t) => t !== undefined)
      .map((t) => ({
        id: t.id,
        tag: t.tag,
        type: [t.type],
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        publishedAt: t.published_at ?? t.created_at,
        revisedAt: t.revised_at ?? t.updated_at,
      }))

    return { row, tags }
  },
})
