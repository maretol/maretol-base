/**
 * KVプレビュー（draftKey互換）の comic ドラフト。TTL などの規則は draft_kv.ts
 */
import type { bandeDessineeDraftRecord, bandeDessineeRow } from 'api-types'
import { listComicTags, listComicSeries } from './db_comic'
import type { BandeDessineeInput } from './db_comic'
import { draftChannel, type DraftRecordBase } from './draft_kv'

export const comicDraft = draftChannel<
  BandeDessineeInput,
  bandeDessineeRow,
  Omit<bandeDessineeDraftRecord, keyof DraftRecordBase>
>({
  kvPrefix: 'draft_bande_dessinee_',
  pagePath: (id) => `/comics/${id}`,
  // current は D1 の保存前の行（新規は null）。作成日時・初公開日時をプレビューに引き継ぐ
  buildRecord: async (input, current) => {
    const now = new Date().toISOString()
    // タグとシリーズの読み取りは独立しているので並行する
    const [allTags, allSeries] = await Promise.all([listComicTags(), input.series_id ? listComicSeries() : []])

    const row: bandeDessineeRow = {
      id: input.id,
      title_name: input.title_name,
      publish_date: input.publish_date,
      publish_event: input.publish_event,
      contents_url: input.contents_url,
      next_id: input.next_id,
      previous_id: input.previous_id,
      tag_id: input.tag_id,
      series_id: input.series_id,
      cover: input.cover,
      back_cover: input.back_cover,
      format: JSON.stringify(input.format),
      filename: input.filename,
      first_page: input.first_page,
      last_page: input.last_page,
      first_left_right: JSON.stringify(input.first_left_right),
      description: input.description,
      // フォームで選択された形式でプレビューする（形式変更もプレビューで確認できるようにする）
      description_format: input.description_format,
      status: input.status,
      created_at: current?.created_at ?? now,
      updated_at: now,
      published_at: current?.published_at ?? now,
      revised_at: now,
    }

    // 配信時の表示に必要なタグ・シリーズ情報を埋め込む
    const tag = allTags.find((t) => t.id === input.tag_id)
    if (!tag) {
      throw new Error(`comic tag not found: ${input.tag_id}`)
    }
    const series = allSeries.find((s) => s.id === input.series_id) ?? null

    return {
      row,
      tag: { id: tag.id, tag_name: tag.tag_name },
      series: series ? { id: series.id, series_name: series.series_name } : null,
    }
  },
})
