/**
 * KVプレビュー（draftKey互換）の comic ドラフト保存処理
 */
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { bandeDessineeDraftRecord, bandeDessineeRow } from 'api-types'
import { generateDraftKey } from './id'
import { getBandeDessinee, listComicTags, listComicSeries } from './db_comic'
import type { BandeDessineeInput } from './db_comic'

const DRAFT_TTL_SECONDS = 3 * 24 * 60 * 60

export async function saveBandeDessineeDraft(input: BandeDessineeInput): Promise<string> {
  const { env } = await getCloudflareContext({ async: true })
  const now = new Date().toISOString()
  const current = await getBandeDessinee(input.id)

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
  const tag = (await listComicTags()).find((t) => t.id === input.tag_id)
  if (!tag) {
    throw new Error(`comic tag not found: ${input.tag_id}`)
  }
  const series = input.series_id ? ((await listComicSeries()).find((s) => s.id === input.series_id) ?? null) : null

  const draftKey = generateDraftKey()
  const record: bandeDessineeDraftRecord = {
    draftKey,
    row,
    tag: { id: tag.id, tag_name: tag.tag_name },
    series: series ? { id: series.id, series_name: series.series_name } : null,
  }

  await env.CMS_DRAFT.put(`draft_bande_dessinee_${input.id}`, JSON.stringify(record), {
    expirationTtl: DRAFT_TTL_SECONDS,
  })

  return draftKey
}
