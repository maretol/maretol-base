/**
 * D1（maretol-cms）へのデータアクセス層（blog）
 * スキーマは cms-db/migrations/0003、行型は api-types の cms_db_types を参照
 */
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { blogContentRow, blogCategoryRow, blogInfoRow } from 'api-types'

async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true })
  return env.DB
}

// --- 記事（contents） ---

// 一覧表示用: カテゴリ名を連結して付加した行
export type BlogContentListRow = blogContentRow & { category_names: string | null }

export async function listBlogContents(): Promise<BlogContentListRow[]> {
  const db = await getDB()
  const result = await db
    .prepare(
      `SELECT c.*,
        (SELECT group_concat(bc.name, ', ') FROM blog_content_categories r
          JOIN blog_categories bc ON bc.id = r.category_id WHERE r.content_id = c.id) AS category_names
       FROM blog_contents c ORDER BY c.created_at DESC`
    )
    .all<BlogContentListRow>()
  return result.results
}

export async function getBlogContent(id: string): Promise<blogContentRow | null> {
  const db = await getDB()
  return await db.prepare(`SELECT * FROM blog_contents WHERE id = ?1`).bind(id).first<blogContentRow>()
}

export async function getBlogContentCategoryIDs(contentID: string): Promise<string[]> {
  const db = await getDB()
  const result = await db
    .prepare(`SELECT category_id FROM blog_content_categories WHERE content_id = ?1 ORDER BY position`)
    .bind(contentID)
    .all<{ category_id: string }>()
  return result.results.map((r) => r.category_id)
}

export type BlogContentInput = {
  id: string
  title: string
  content: string
  ogp_image: string | null
  sns_text: string | null
  is_secret: boolean
  secret_code: string | null
  status: 'PUBLISH' | 'DRAFT' | 'CLOSED'
  categoryIDs: string[]
}

export async function createBlogContent(input: BlogContentInput): Promise<void> {
  const db = await getDB()
  const now = new Date().toISOString()
  const publishedAt = input.status === 'PUBLISH' ? now : null

  await db
    .prepare(
      `INSERT INTO blog_contents
        (id, title, content, content_format, ogp_image, sns_text, is_secret, secret_code, status, created_at, updated_at, published_at, revised_at)
       VALUES (?1, ?2, ?3, 'markdown', ?4, ?5, ?6, ?7, ?8, ?9, ?9, ?10, ?10)`
    )
    .bind(
      input.id,
      input.title,
      input.content,
      input.ogp_image,
      input.sns_text,
      input.is_secret ? 1 : 0,
      input.secret_code,
      input.status,
      now,
      publishedAt
    )
    .run()

  await replaceCategoryRelations(db, input.id, input.categoryIDs)
}

export async function updateBlogContent(input: BlogContentInput): Promise<void> {
  const db = await getDB()
  const current = await getBlogContent(input.id)
  if (!current) {
    throw new Error(`blog content not found: ${input.id}`)
  }
  const now = new Date().toISOString()
  const publishedAt = input.status === 'PUBLISH' ? (current.published_at ?? now) : current.published_at
  const revisedAt = input.status === 'PUBLISH' ? now : current.revised_at

  await db
    .prepare(
      `UPDATE blog_contents SET
        title = ?2, content = ?3, ogp_image = ?4, sns_text = ?5, is_secret = ?6, secret_code = ?7, status = ?8,
        updated_at = ?9, published_at = ?10, revised_at = ?11
       WHERE id = ?1`
    )
    .bind(
      input.id,
      input.title,
      input.content,
      input.ogp_image,
      input.sns_text,
      input.is_secret ? 1 : 0,
      input.secret_code,
      input.status,
      now,
      publishedAt,
      revisedAt
    )
    .run()

  await replaceCategoryRelations(db, input.id, input.categoryIDs)
}

async function replaceCategoryRelations(db: D1Database, contentID: string, categoryIDs: string[]): Promise<void> {
  const statements = [
    db.prepare(`DELETE FROM blog_content_categories WHERE content_id = ?1`).bind(contentID),
    ...categoryIDs.map((categoryID, position) =>
      db
        .prepare(`INSERT INTO blog_content_categories (content_id, category_id, position) VALUES (?1, ?2, ?3)`)
        .bind(contentID, categoryID, position)
    ),
  ]
  await db.batch(statements)
}

// --- カテゴリ ---

export async function listBlogCategories(): Promise<blogCategoryRow[]> {
  const db = await getDB()
  const result = await db.prepare(`SELECT * FROM blog_categories ORDER BY sort_order`).all<blogCategoryRow>()
  return result.results
}

export async function createBlogCategory(input: { id: string; name: string }): Promise<void> {
  const db = await getDB()
  const now = new Date().toISOString()
  // 新規カテゴリは末尾に追加する
  const maxRow = await db.prepare(`SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM blog_categories`).first<{
    max_order: number
  }>()
  await db
    .prepare(
      `INSERT INTO blog_categories (id, name, sort_order, created_at, updated_at, published_at, revised_at)
       VALUES (?1, ?2, ?3, ?4, ?4, ?4, ?4)`
    )
    .bind(input.id, input.name, (maxRow?.max_order ?? -1) + 1, now)
    .run()
}

// カテゴリの表示順を一括更新する
export async function updateBlogCategoryOrders(orders: { id: string; sort_order: number }[]): Promise<void> {
  if (orders.length === 0) {
    return
  }
  const db = await getDB()
  const now = new Date().toISOString()
  await db.batch(
    orders.map((o) =>
      db
        .prepare(`UPDATE blog_categories SET sort_order = ?2, updated_at = ?3 WHERE id = ?1`)
        .bind(o.id, o.sort_order, now)
    )
  )
}

// --- 固定ページ（info） ---

export async function listBlogInfo(): Promise<blogInfoRow[]> {
  const db = await getDB()
  const result = await db.prepare(`SELECT * FROM blog_info ORDER BY created_at`).all<blogInfoRow>()
  return result.results
}

export async function getBlogInfo(id: string): Promise<blogInfoRow | null> {
  const db = await getDB()
  return await db.prepare(`SELECT * FROM blog_info WHERE id = ?1`).bind(id).first<blogInfoRow>()
}

export type BlogInfoInput = {
  id: string
  page_pathname: string
  title: string | null
  main_text: string
  status: 'PUBLISH' | 'DRAFT' | 'CLOSED'
}

export async function createBlogInfo(input: BlogInfoInput): Promise<void> {
  const db = await getDB()
  const now = new Date().toISOString()
  const publishedAt = input.status === 'PUBLISH' ? now : null
  await db
    .prepare(
      `INSERT INTO blog_info (id, page_pathname, title, main_text, main_text_format, status, created_at, updated_at, published_at, revised_at)
       VALUES (?1, ?2, ?3, ?4, 'markdown', ?5, ?6, ?6, ?7, ?7)`
    )
    .bind(input.id, input.page_pathname, input.title, input.main_text, input.status, now, publishedAt)
    .run()
}

export async function updateBlogInfo(input: BlogInfoInput): Promise<void> {
  const db = await getDB()
  const current = await getBlogInfo(input.id)
  if (!current) {
    throw new Error(`blog info not found: ${input.id}`)
  }
  const now = new Date().toISOString()
  const publishedAt = input.status === 'PUBLISH' ? (current.published_at ?? now) : current.published_at
  const revisedAt = input.status === 'PUBLISH' ? now : current.revised_at
  await db
    .prepare(
      `UPDATE blog_info SET page_pathname = ?2, title = ?3, main_text = ?4, status = ?5,
        updated_at = ?6, published_at = ?7, revised_at = ?8
       WHERE id = ?1`
    )
    .bind(input.id, input.page_pathname, input.title, input.main_text, input.status, now, publishedAt, revisedAt)
    .run()
}

// --- 静的文言（static, key-value） ---

export async function listBlogStatic(): Promise<{ key: string; value: string; updated_at: string }[]> {
  const db = await getDB()
  const result = await db
    .prepare(`SELECT * FROM blog_static ORDER BY key`)
    .all<{ key: string; value: string; updated_at: string }>()
  return result.results
}

export async function upsertBlogStatic(key: string, value: string): Promise<void> {
  const db = await getDB()
  const now = new Date().toISOString()
  await db
    .prepare(`INSERT OR REPLACE INTO blog_static (key, value, updated_at) VALUES (?1, ?2, ?3)`)
    .bind(key, value, now)
    .run()
  // API互換のタイムスタンプ（updatedAt行）も更新する
  await db
    .prepare(`UPDATE blog_static SET value = ?1, updated_at = ?1 WHERE key = 'updatedAt'`)
    .bind(now)
    .run()
}
