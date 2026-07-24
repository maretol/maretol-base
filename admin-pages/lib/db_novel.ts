/**
 * D1（maretol-cms）へのデータアクセス層（novel）
 * スキーマは cms-db/migrations/0004、行型は api-types の cms_db_types を参照
 */
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { novelRow, novelTagRow, novelSeriesRow } from 'api-types'
import type { ContentFormat } from './content-format'

async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true })
  return env.DB
}

// 一覧表示用: タグ名・シリーズ名を付加した行
export type NovelListRow = novelRow & { tag_name: string | null; series_name: string | null }

export async function listNovels(): Promise<NovelListRow[]> {
  const db = await getDB()
  const result = await db
    .prepare(
      `SELECT n.*, t.tag_name AS tag_name, s.series_name AS series_name
       FROM novels n
       LEFT JOIN novel_tags t ON t.id = n.tag_id
       LEFT JOIN novel_series s ON s.id = n.series_id
       ORDER BY n.created_at DESC`
    )
    .all<NovelListRow>()
  return result.results
}

export async function getNovel(id: string): Promise<novelRow | null> {
  const db = await getDB()
  return await db.prepare(`SELECT * FROM novels WHERE id = ?1`).bind(id).first<novelRow>()
}

export async function listNovelTags(): Promise<novelTagRow[]> {
  const db = await getDB()
  const result = await db.prepare(`SELECT * FROM novel_tags ORDER BY created_at`).all<novelTagRow>()
  return result.results
}

export async function listNovelSeries(): Promise<novelSeriesRow[]> {
  const db = await getDB()
  const result = await db.prepare(`SELECT * FROM novel_series ORDER BY created_at`).all<novelSeriesRow>()
  return result.results
}

// 前後の巻セレクトの候補用: シリーズで絞り込むため series_id を含む軽量な行
export type NovelRef = {
  id: string
  title_name: string
  series_id: string | null
}

export async function listNovelRefs(): Promise<NovelRef[]> {
  const db = await getDB()
  const result = await db
    .prepare(
      `SELECT id, title_name, series_id FROM novels
       ORDER BY publish_date IS NULL, publish_date, created_at`
    )
    .all<NovelRef>()
  return result.results
}

// 双方向リンクの自動同期用: 隣接する小説のポインタのみ書き換える
// SNS通知・published_at 等の副作用を伴わないよう、通常の update とは分けている
export async function setNovelNextID(id: string, nextId: string | null): Promise<void> {
  const db = await getDB()
  await db
    .prepare(`UPDATE novels SET next_id = ?2, updated_at = ?3 WHERE id = ?1`)
    .bind(id, nextId, new Date().toISOString())
    .run()
}

export async function setNovelPreviousID(id: string, previousId: string | null): Promise<void> {
  const db = await getDB()
  await db
    .prepare(`UPDATE novels SET previous_id = ?2, updated_at = ?3 WHERE id = ?1`)
    .bind(id, previousId, new Date().toISOString())
    .run()
}

export type NovelInput = {
  id: string
  title_name: string
  publish_date: string | null
  publish_event: string | null
  contents_url: string
  next_id: string | null
  previous_id: string | null
  tag_id: string
  series_id: string | null
  cover: string | null
  description: string
  description_format: ContentFormat
  status: 'PUBLISH' | 'DRAFT' | 'CLOSED'
}

export async function createNovel(input: NovelInput): Promise<void> {
  const db = await getDB()
  const now = new Date().toISOString()
  const publishedAt = input.status === 'PUBLISH' ? now : null

  await db
    .prepare(
      `INSERT INTO novels
        (id, title_name, publish_date, publish_event, contents_url, next_id, previous_id, tag_id, series_id,
         cover, description, description_format, status, created_at, updated_at, published_at, revised_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?14, ?15, ?15)`
    )
    .bind(
      input.id,
      input.title_name,
      input.publish_date,
      input.publish_event,
      input.contents_url,
      input.next_id,
      input.previous_id,
      input.tag_id,
      input.series_id,
      input.cover,
      input.description,
      input.description_format,
      input.status,
      now,
      publishedAt
    )
    .run()
}

export async function updateNovel(input: NovelInput): Promise<void> {
  const db = await getDB()
  const current = await getNovel(input.id)
  if (!current) {
    throw new Error(`novel not found: ${input.id}`)
  }
  const now = new Date().toISOString()
  // published_at は初公開日時を保持。未公開→公開の遷移時のみ現在時刻を設定する
  const publishedAt = input.status === 'PUBLISH' ? (current.published_at ?? now) : current.published_at
  const revisedAt = input.status === 'PUBLISH' ? now : current.revised_at

  await db
    .prepare(
      `UPDATE novels SET
        title_name = ?2, publish_date = ?3, publish_event = ?4, contents_url = ?5, next_id = ?6, previous_id = ?7,
        tag_id = ?8, series_id = ?9, cover = ?10, description = ?11, description_format = ?12, status = ?13,
        updated_at = ?14, published_at = ?15, revised_at = ?16
       WHERE id = ?1`
    )
    .bind(
      input.id,
      input.title_name,
      input.publish_date,
      input.publish_event,
      input.contents_url,
      input.next_id,
      input.previous_id,
      input.tag_id,
      input.series_id,
      input.cover,
      input.description,
      input.description_format,
      input.status,
      now,
      publishedAt,
      revisedAt
    )
    .run()
}

export async function createNovelTag(input: { id: string; tag_name: string }): Promise<void> {
  const db = await getDB()
  const now = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO novel_tags (id, tag_name, created_at, updated_at, published_at, revised_at)
       VALUES (?1, ?2, ?3, ?3, ?3, ?3)`
    )
    .bind(input.id, input.tag_name, now)
    .run()
}

export async function createNovelSeries(input: { id: string; series_name: string }): Promise<void> {
  const db = await getDB()
  const now = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO novel_series (id, series_name, created_at, updated_at, published_at, revised_at)
       VALUES (?1, ?2, ?3, ?3, ?3, ?3)`
    )
    .bind(input.id, input.series_name, now)
    .run()
}
