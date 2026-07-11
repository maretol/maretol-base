/**
 * D1（内製CMS DB）からコンテンツを取得する処理
 * micro_cms.ts と同じ結果型を返し、index.ts 側の parse 処理を共有する
 *
 * cms_design.md「主要クエリの対応表」参照。公開サイト向けのため常に status='PUBLISH' で絞る
 */
import { atelierResult, atelierTagAndCategory } from 'api-types'
import { convertMarkdownToHtml } from 'md-converter'

type AtelierRow = {
  id: string
  title: string
  src: string
  object_position: string
  description: string | null
  description_format: 'html' | 'markdown'
  status: string
  created_at: string
  updated_at: string
  published_at: string | null
  revised_at: string | null
}

type AtelierTagJoinRow = {
  atelier_id: string
  position: number
  id: string
  tag: string
  type: string
  created_at: string
  updated_at: string
  published_at: string | null
  revised_at: string | null
}

// Markdown形式のレコードは配信時に互換HTMLへ変換し、以降はHTML記事と同じ経路（parse()）に乗せる
function toDeliveryHTML(content: string | null, format: 'html' | 'markdown'): string {
  if (content === null || content === '') {
    return ''
  }
  return format === 'markdown' ? convertMarkdownToHtml(content) : content
}

function toTagAndCategory(row: AtelierTagJoinRow): atelierTagAndCategory {
  return {
    id: row.id,
    tag: row.tag,
    // DBでは単一値のTEXTで持ち、API互換のため配列に包む（cms_design.md 参照）
    type: [row.type],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? row.created_at,
    revisedAt: row.revised_at ?? row.updated_at,
  }
}

function toAtelierResult(row: AtelierRow, tags: atelierTagAndCategory[]): atelierResult {
  return {
    id: row.id,
    title: row.title,
    src: row.src,
    object_position: row.object_position,
    description: toDeliveryHTML(row.description, row.description_format),
    tag_or_category: tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? row.created_at,
    revisedAt: row.revised_at ?? row.updated_at,
  } as atelierResult // parsed_description / table_of_contents は index.ts が parse() 結果を代入する
}

async function getTagsByAtelierIDs(db: D1Database, atelierIDs: string[]): Promise<Map<string, atelierTagAndCategory[]>> {
  const map = new Map<string, atelierTagAndCategory[]>()
  if (atelierIDs.length === 0) {
    return map
  }
  const placeholders = atelierIDs.map((_, i) => `?${i + 1}`).join(', ')
  const result = await db
    .prepare(
      `SELECT r.atelier_id, r.position, t.id, t.tag, t.type, t.created_at, t.updated_at, t.published_at, t.revised_at
       FROM atelier_tag_relations r
       JOIN atelier_tags t ON t.id = r.tag_id
       WHERE r.atelier_id IN (${placeholders})
       ORDER BY r.atelier_id, r.position`
    )
    .bind(...atelierIDs)
    .all<AtelierTagJoinRow>()

  for (const row of result.results) {
    const list = map.get(row.atelier_id) ?? []
    list.push(toTagAndCategory(row))
    map.set(row.atelier_id, list)
  }
  return map
}

export async function getAteliersFromD1(
  db: D1Database,
  offset: number,
  limit: number
): Promise<{ ateliers: atelierResult[]; total: number }> {
  const countRow = await db.prepare(`SELECT COUNT(*) AS cnt FROM ateliers WHERE status = 'PUBLISH'`).first<{ cnt: number }>()
  const total = countRow?.cnt ?? 0

  const rows = await db
    .prepare(`SELECT * FROM ateliers WHERE status = 'PUBLISH' ORDER BY published_at DESC LIMIT ?1 OFFSET ?2`)
    .bind(limit, offset)
    .all<AtelierRow>()

  const tagMap = await getTagsByAtelierIDs(
    db,
    rows.results.map((r) => r.id)
  )
  const ateliers = rows.results.map((row) => toAtelierResult(row, tagMap.get(row.id) ?? []))

  return { ateliers, total }
}

export async function getAtelierFromD1(db: D1Database, contentID: string): Promise<atelierResult> {
  const row = await db
    .prepare(`SELECT * FROM ateliers WHERE id = ?1 AND status = 'PUBLISH'`)
    .bind(contentID)
    .first<AtelierRow>()
  if (!row) {
    throw new Error(`atelier not found: ${contentID}`)
  }
  const tagMap = await getTagsByAtelierIDs(db, [row.id])
  return toAtelierResult(row, tagMap.get(row.id) ?? [])
}

// テスト用に公開する
export { toAtelierResult, toDeliveryHTML }
export type { AtelierRow }
