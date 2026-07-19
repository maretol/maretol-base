/**
 * KVプレビュー（draftKey互換）の novel ドラフト保存処理
 */
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { novelDraftRecord, novelRow } from 'api-types'
import { generateDraftKey } from './id'
import { getNovel, listNovelTags, listNovelSeries } from './db_novel'
import type { NovelInput } from './db_novel'

const DRAFT_TTL_SECONDS = 3 * 24 * 60 * 60

export async function saveNovelDraft(input: NovelInput, regenerateKey = false): Promise<string> {
  const { env } = await getCloudflareContext({ async: true })
  const now = new Date().toISOString()
  const current = await getNovel(input.id)
  const kvKey = `draft_novel_${input.id}`

  // 既存ドラフトのdraftKeyを維持する（共有済みのプレビューURLを変えないため）。再生成指定時のみ新しいキーにする
  let draftKey: string | null = null
  if (!regenerateKey) {
    const existing = await env.CMS_DRAFT.get<novelDraftRecord>(kvKey, 'json')
    draftKey = existing?.draftKey ?? null
  }
  draftKey ??= generateDraftKey()

  const row: novelRow = {
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
  const tag = (await listNovelTags()).find((t) => t.id === input.tag_id)
  if (!tag) {
    throw new Error(`novel tag not found: ${input.tag_id}`)
  }
  const series = input.series_id ? ((await listNovelSeries()).find((s) => s.id === input.series_id) ?? null) : null

  const record: novelDraftRecord = {
    draftKey,
    row,
    tag: { id: tag.id, tag_name: tag.tag_name },
    series: series ? { id: series.id, series_name: series.series_name } : null,
  }

  await env.CMS_DRAFT.put(kvKey, JSON.stringify(record), {
    expirationTtl: DRAFT_TTL_SECONDS,
  })

  return draftKey
}
