/**
 * D1（maretol-cms）へのデータアクセス層（comic / bande-dessinee）
 * スキーマは cms-db/migrations/0002、行型は api-types の cms_db_types を参照
 */
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { bandeDessineeRow, bandeDessineeTagRow, bandeDessineeSeriesRow } from 'api-types'

async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true })
  return env.DB
}

export async function listBandeDessinees(): Promise<bandeDessineeRow[]> {
  const db = await getDB()
  const result = await db
    .prepare(`SELECT * FROM bande_dessinees ORDER BY published_at DESC, updated_at DESC`)
    .all<bandeDessineeRow>()
  return result.results
}

export async function getBandeDessinee(id: string): Promise<bandeDessineeRow | null> {
  const db = await getDB()
  return await db.prepare(`SELECT * FROM bande_dessinees WHERE id = ?1`).bind(id).first<bandeDessineeRow>()
}

export async function listComicTags(): Promise<bandeDessineeTagRow[]> {
  const db = await getDB()
  const result = await db.prepare(`SELECT * FROM bande_dessinee_tags ORDER BY created_at`).all<bandeDessineeTagRow>()
  return result.results
}

export async function listComicSeries(): Promise<bandeDessineeSeriesRow[]> {
  const db = await getDB()
  const result = await db
    .prepare(`SELECT * FROM bande_dessinee_series ORDER BY created_at`)
    .all<bandeDessineeSeriesRow>()
  return result.results
}

export type BandeDessineeInput = {
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
  back_cover: string | null
  format: string[] // 例: ['png']
  filename: string
  first_page: number
  last_page: number
  first_left_right: ('left' | 'right')[]
  description: string
  status: 'PUBLISH' | 'DRAFT' | 'CLOSED'
}

export async function createBandeDessinee(input: BandeDessineeInput): Promise<void> {
  const db = await getDB()
  const now = new Date().toISOString()
  const publishedAt = input.status === 'PUBLISH' ? now : null

  await db
    .prepare(
      `INSERT INTO bande_dessinees
        (id, title_name, publish_date, publish_event, contents_url, next_id, previous_id, tag_id, series_id,
         cover, back_cover, format, filename, first_page, last_page, first_left_right,
         description, description_format, status, created_at, updated_at, published_at, revised_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, 'markdown', ?18, ?19, ?19, ?20, ?20)`
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
      input.back_cover,
      JSON.stringify(input.format),
      input.filename,
      input.first_page,
      input.last_page,
      JSON.stringify(input.first_left_right),
      input.description,
      input.status,
      now,
      publishedAt
    )
    .run()
}

export async function updateBandeDessinee(input: BandeDessineeInput): Promise<void> {
  const db = await getDB()
  const current = await getBandeDessinee(input.id)
  if (!current) {
    throw new Error(`bande dessinee not found: ${input.id}`)
  }
  const now = new Date().toISOString()
  // published_at は初公開日時を保持。未公開→公開の遷移時のみ現在時刻を設定する
  const publishedAt = input.status === 'PUBLISH' ? (current.published_at ?? now) : current.published_at
  const revisedAt = input.status === 'PUBLISH' ? now : current.revised_at

  await db
    .prepare(
      `UPDATE bande_dessinees SET
        title_name = ?2, publish_date = ?3, publish_event = ?4, contents_url = ?5, next_id = ?6, previous_id = ?7,
        tag_id = ?8, series_id = ?9, cover = ?10, back_cover = ?11, format = ?12, filename = ?13,
        first_page = ?14, last_page = ?15, first_left_right = ?16, description = ?17, status = ?18,
        updated_at = ?19, published_at = ?20, revised_at = ?21
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
      input.back_cover,
      JSON.stringify(input.format),
      input.filename,
      input.first_page,
      input.last_page,
      JSON.stringify(input.first_left_right),
      input.description,
      input.status,
      now,
      publishedAt,
      revisedAt
    )
    .run()
}

export async function createComicTag(input: { id: string; tag_name: string }): Promise<void> {
  const db = await getDB()
  const now = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO bande_dessinee_tags (id, tag_name, created_at, updated_at, published_at, revised_at)
       VALUES (?1, ?2, ?3, ?3, ?3, ?3)`
    )
    .bind(input.id, input.tag_name, now)
    .run()
}

export async function createComicSeries(input: { id: string; series_name: string }): Promise<void> {
  const db = await getDB()
  const now = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO bande_dessinee_series (id, series_name, created_at, updated_at, published_at, revised_at)
       VALUES (?1, ?2, ?3, ?3, ?3, ?3)`
    )
    .bind(input.id, input.series_name, now)
    .run()
}
