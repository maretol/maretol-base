/**
 * KVプレビュー（draftKey互換）のドラフト保存処理
 * 編集中の内容を D1 レコードと同一形状で CMS_DRAFT に書き込み、
 * cms-data-fetcher が draftKey 付きリクエストで参照する（cms_goal.md 参照）
 */
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { atelierDraftRecord, atelierRow } from 'api-types'
import { generateDraftKey } from './id'
import { getAtelier, listTags } from './db'
import type { AtelierInput } from './db'

// プレビューURLの有効期間（KVのTTL）。失効後は再度プレビュー保存すればよい
const DRAFT_TTL_SECONDS = 3 * 24 * 60 * 60

export async function saveAtelierDraft(input: AtelierInput, regenerateKey = false): Promise<string> {
  const { env } = await getCloudflareContext({ async: true })
  const now = new Date().toISOString()
  const current = await getAtelier(input.id)
  const kvKey = `draft_atelier_${input.id}`

  // 既存ドラフトのdraftKeyを維持する（共有済みのプレビューURLを変えないため）。再生成指定時のみ新しいキーにする
  let draftKey: string | null = null
  if (!regenerateKey) {
    const existing = await env.CMS_DRAFT.get<atelierDraftRecord>(kvKey, 'json')
    draftKey = existing?.draftKey ?? null
  }
  draftKey ??= generateDraftKey()

  const row: atelierRow = {
    id: input.id,
    title: input.title,
    src: input.src,
    object_position: input.object_position,
    description: input.description,
    // 既存レコードの形式を維持する。新規（D1未保存）は markdown
    description_format: current?.description_format ?? 'markdown',
    status: input.status,
    created_at: current?.created_at ?? now,
    updated_at: now,
    published_at: current?.published_at ?? now,
    revised_at: now,
  }

  // 配信時のタグ表示に必要な情報を埋め込む（fetcher側でのJOINを不要にする）
  const allTags = await listTags()
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

  const record: atelierDraftRecord = { draftKey, row, tags }

  await env.CMS_DRAFT.put(kvKey, JSON.stringify(record), {
    expirationTtl: DRAFT_TTL_SECONDS,
  })

  return draftKey
}
