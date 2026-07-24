/**
 * D1（内製CMS DB）からコンテンツを取得する処理
 * micro_cms.ts と同じ結果型を返し、index.ts 側の parse 処理を共有する
 *
 * cms_design.md「主要クエリの対応表」参照。公開サイト向けのため常に status='PUBLISH' で絞る
 */
import {
  atelierResult,
  atelierTagAndCategory,
  atelierRow,
  atelierDraftRecord,
  bandeDessineeResult,
  bandeDessineeRow,
  bandeDessineeDraftRecord,
  novelResult,
  novelRow,
  novelDraftRecord,
} from 'api-types'
import { convertMarkdownToHtml } from 'md-converter'

type AtelierRow = atelierRow

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

// KVプレビュー: 管理ページが保存したドラフト（draft_atelier_{id}）を参照する
// draftKey が一致した場合のみドラフトを返し、それ以外は null（呼び出し側でD1にフォールバック）
export async function getAtelierDraftFromKV(
  kv: KVNamespace,
  contentID: string,
  draftKey: string
): Promise<atelierResult | null> {
  const raw = await kv.get(`draft_atelier_${contentID}`)
  if (!raw) {
    return null
  }
  const record = JSON.parse(raw) as atelierDraftRecord
  if (record.draftKey !== draftKey) {
    return null
  }
  return toAtelierResult(record.row, record.tags)
}

// --- comic (bande-dessinee) ---

// JOIN結果の行型（本体 + タグ名 + シリーズ名）
type BandeDessineeJoinRow = bandeDessineeRow & {
  tag_name: string
  series_name: string | null
}

function toBandeDessineeResult(
  row: bandeDessineeRow,
  tag: { id: string; tag_name: string },
  series: { id: string; series_name: string } | null
): bandeDessineeResult {
  return {
    id: row.id,
    title_name: row.title_name,
    publish_date: row.publish_date ?? undefined,
    publish_event: row.publish_event ?? undefined,
    contents_url: row.contents_url,
    next_id: row.next_id ?? undefined,
    previous_id: row.previous_id ?? undefined,
    tag: tag,
    series: series ?? undefined,
    cover: row.cover ?? undefined,
    back_cover: row.back_cover ?? undefined,
    format: JSON.parse(row.format) as string[],
    filename: row.filename,
    first_page: row.first_page,
    last_page: row.last_page,
    first_left_right: JSON.parse(row.first_left_right) as ('right' | 'left')[],
    description: toDeliveryHTML(row.description, row.description_format),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? row.created_at,
  } as bandeDessineeResult // parsed_description / table_of_contents は index.ts が parse() 結果を代入する
}

function joinRowToResult(row: BandeDessineeJoinRow): bandeDessineeResult {
  const { tag_name, series_name, ...body } = row
  return toBandeDessineeResult(
    body,
    { id: row.tag_id, tag_name },
    row.series_id !== null && series_name !== null ? { id: row.series_id, series_name } : null
  )
}

const BANDE_DESSINEE_SELECT = `
  SELECT b.*, t.tag_name, s.series_name
  FROM bande_dessinees b
  JOIN bande_dessinee_tags t ON t.id = b.tag_id
  LEFT JOIN bande_dessinee_series s ON s.id = b.series_id`

export async function getBandeDessineesFromD1(
  db: D1Database,
  offset: number,
  limit: number
): Promise<{ bandeDessinees: bandeDessineeResult[]; total: number }> {
  const countRow = await db
    .prepare(`SELECT COUNT(*) AS cnt FROM bande_dessinees WHERE status = 'PUBLISH'`)
    .first<{ cnt: number }>()
  const total = countRow?.cnt ?? 0

  const rows = await db
    .prepare(`${BANDE_DESSINEE_SELECT} WHERE b.status = 'PUBLISH' ORDER BY b.published_at DESC LIMIT ?1 OFFSET ?2`)
    .bind(limit, offset)
    .all<BandeDessineeJoinRow>()

  return { bandeDessinees: rows.results.map(joinRowToResult), total }
}

export async function getBandeDessineeFromD1(db: D1Database, contentID: string): Promise<bandeDessineeResult> {
  const row = await db
    .prepare(`${BANDE_DESSINEE_SELECT} WHERE b.id = ?1 AND b.status = 'PUBLISH'`)
    .bind(contentID)
    .first<BandeDessineeJoinRow>()
  if (!row) {
    throw new Error(`bande dessinee not found: ${contentID}`)
  }
  return joinRowToResult(row)
}

// KVプレビュー: 管理ページが保存したドラフト（draft_bande_dessinee_{id}）を参照する
export async function getBandeDessineeDraftFromKV(
  kv: KVNamespace,
  contentID: string,
  draftKey: string
): Promise<bandeDessineeResult | null> {
  const raw = await kv.get(`draft_bande_dessinee_${contentID}`)
  if (!raw) {
    return null
  }
  const record = JSON.parse(raw) as bandeDessineeDraftRecord
  if (record.draftKey !== draftKey) {
    return null
  }
  return toBandeDessineeResult(record.row, record.tag, record.series)
}

// --- novel ---

// JOIN結果の行型（本体 + タグ名 + シリーズ名）
type NovelJoinRow = novelRow & {
  tag_name: string
  series_name: string | null
}

function toNovelResult(
  row: novelRow,
  tag: { id: string; tag_name: string },
  series: { id: string; series_name: string } | null
): novelResult {
  return {
    id: row.id,
    title_name: row.title_name,
    publish_date: row.publish_date ?? undefined,
    publish_event: row.publish_event ?? undefined,
    contents_url: row.contents_url,
    next_id: row.next_id ?? undefined,
    previous_id: row.previous_id ?? undefined,
    tag: tag,
    series: series ?? undefined,
    cover: row.cover ?? undefined,
    description: toDeliveryHTML(row.description, row.description_format),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? row.created_at,
  } as novelResult // parsed_description / table_of_contents は index.ts が parse() 結果を代入する
}

function novelJoinRowToResult(row: NovelJoinRow): novelResult {
  const { tag_name, series_name, ...body } = row
  return toNovelResult(
    body,
    { id: row.tag_id, tag_name },
    row.series_id !== null && series_name !== null ? { id: row.series_id, series_name } : null
  )
}

const NOVEL_SELECT = `
  SELECT n.*, t.tag_name, s.series_name
  FROM novels n
  JOIN novel_tags t ON t.id = n.tag_id
  LEFT JOIN novel_series s ON s.id = n.series_id`

export async function getNovelsFromD1(
  db: D1Database,
  offset: number,
  limit: number
): Promise<{ novels: novelResult[]; total: number }> {
  const countRow = await db.prepare(`SELECT COUNT(*) AS cnt FROM novels WHERE status = 'PUBLISH'`).first<{ cnt: number }>()
  const total = countRow?.cnt ?? 0

  const rows = await db
    .prepare(`${NOVEL_SELECT} WHERE n.status = 'PUBLISH' ORDER BY n.published_at DESC LIMIT ?1 OFFSET ?2`)
    .bind(limit, offset)
    .all<NovelJoinRow>()

  return { novels: rows.results.map(novelJoinRowToResult), total }
}

export async function getNovelFromD1(db: D1Database, contentID: string): Promise<novelResult> {
  const row = await db
    .prepare(`${NOVEL_SELECT} WHERE n.id = ?1 AND n.status = 'PUBLISH'`)
    .bind(contentID)
    .first<NovelJoinRow>()
  if (!row) {
    throw new Error(`novel not found: ${contentID}`)
  }
  return novelJoinRowToResult(row)
}

// KVプレビュー: 管理ページが保存したドラフト（draft_novel_{id}）を参照する
export async function getNovelDraftFromKV(
  kv: KVNamespace,
  contentID: string,
  draftKey: string
): Promise<novelResult | null> {
  const raw = await kv.get(`draft_novel_${contentID}`)
  if (!raw) {
    return null
  }
  const record = JSON.parse(raw) as novelDraftRecord
  if (record.draftKey !== draftKey) {
    return null
  }
  return toNovelResult(record.row, record.tag, record.series)
}

// テスト用に公開する
export { toAtelierResult, toDeliveryHTML, toBandeDessineeResult, toNovelResult }
export type { AtelierRow }
