/**
 * D1（maretol-cms）へのデータアクセス層（illust）
 * スキーマは cms-db/migrations/、行型は api-types の cms_db_types を参照
 */
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { atelierRow, atelierTagRow } from 'api-types'
import type { ContentFormat } from './content-format'

async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true })
  return env.DB
}

export async function listAteliers(): Promise<atelierRow[]> {
  const db = await getDB()
  const result = await db
    .prepare(`SELECT * FROM ateliers ORDER BY created_at DESC`)
    .all<atelierRow>()
  return result.results
}

export async function getAtelier(id: string): Promise<atelierRow | null> {
  const db = await getDB()
  return await db.prepare(`SELECT * FROM ateliers WHERE id = ?1`).bind(id).first<atelierRow>()
}

export async function listTags(): Promise<atelierTagRow[]> {
  const db = await getDB()
  const result = await db.prepare(`SELECT * FROM atelier_tags ORDER BY created_at`).all<atelierTagRow>()
  return result.results
}

// 指定atelierに紐づくタグID（position順）
export async function getAtelierTagIDs(atelierID: string): Promise<string[]> {
  const db = await getDB()
  const result = await db
    .prepare(`SELECT tag_id FROM atelier_tag_relations WHERE atelier_id = ?1 ORDER BY position`)
    .bind(atelierID)
    .all<{ tag_id: string }>()
  return result.results.map((r) => r.tag_id)
}

export type AtelierInput = {
  id: string
  title: string
  src: string
  object_position: string
  description: string
  description_format: ContentFormat
  status: 'PUBLISH' | 'DRAFT' | 'CLOSED'
  tagIDs: string[]
}

export async function createAtelier(input: AtelierInput): Promise<void> {
  const db = await getDB()
  const now = new Date().toISOString()
  // 公開時のみ published_at / revised_at を設定する（microCMSのタイムスタンプ運用に準拠）
  const publishedAt = input.status === 'PUBLISH' ? now : null

  await db
    .prepare(
      `INSERT INTO ateliers
        (id, title, src, object_position, description, description_format, status, created_at, updated_at, published_at, revised_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8, ?9, ?9)`
    )
    .bind(
      input.id,
      input.title,
      input.src,
      input.object_position,
      input.description,
      input.description_format,
      input.status,
      now,
      publishedAt
    )
    .run()

  await replaceTagRelations(db, input.id, input.tagIDs)
}

export async function updateAtelier(input: AtelierInput): Promise<void> {
  const db = await getDB()
  const current = await getAtelier(input.id)
  if (!current) {
    throw new Error(`atelier not found: ${input.id}`)
  }
  const now = new Date().toISOString()
  // published_at は初公開日時を保持。未公開→公開の遷移時のみ現在時刻を設定する
  const publishedAt = input.status === 'PUBLISH' ? (current.published_at ?? now) : current.published_at
  // revised_at は「公開状態での内容更新」の日時
  const revisedAt = input.status === 'PUBLISH' ? now : current.revised_at

  await db
    .prepare(
      `UPDATE ateliers SET
        title = ?2, src = ?3, object_position = ?4, description = ?5, description_format = ?6, status = ?7,
        updated_at = ?8, published_at = ?9, revised_at = ?10
       WHERE id = ?1`
    )
    .bind(
      input.id,
      input.title,
      input.src,
      input.object_position,
      input.description,
      input.description_format,
      input.status,
      now,
      publishedAt,
      revisedAt
    )
    .run()

  await replaceTagRelations(db, input.id, input.tagIDs)
}

async function replaceTagRelations(db: D1Database, atelierID: string, tagIDs: string[]): Promise<void> {
  const statements = [
    db.prepare(`DELETE FROM atelier_tag_relations WHERE atelier_id = ?1`).bind(atelierID),
    ...tagIDs.map((tagID, position) =>
      db
        .prepare(`INSERT INTO atelier_tag_relations (atelier_id, tag_id, position) VALUES (?1, ?2, ?3)`)
        .bind(atelierID, tagID, position)
    ),
  ]
  await db.batch(statements)
}

export async function createTag(input: { id: string; tag: string; type: string }): Promise<void> {
  const db = await getDB()
  const now = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO atelier_tags (id, tag, type, created_at, updated_at, published_at, revised_at)
       VALUES (?1, ?2, ?3, ?4, ?4, ?4, ?4)`
    )
    .bind(input.id, input.tag, input.type, now)
    .run()
}
