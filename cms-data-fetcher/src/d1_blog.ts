/**
 * D1（内製CMS DB）からblogコンテンツを取得する処理
 * micro_cms.ts と同じ結果型を返し、index.ts 側の parse 処理を共有する
 *
 * cms_design.md「主要クエリの対応表」参照
 * - 一覧系は常に status='PUBLISH' AND is_secret=0 で絞る（限定公開記事は一覧に出さない）
 * - 単体取得は is_secret でも返す（閲覧ゲートは pages 側の secret_code 照合で行う）
 */
import {
  contentsAPIResult,
  adjacentContentsResult,
  categoryAPIResult,
  infoAPIResult,
  staticAPIResult,
  blogContentRow,
  blogCategoryRow,
  blogInfoRow,
  blogContentDraftRecord,
} from 'api-types'
import { toDeliveryHTML } from './d1'

function toCategoryAPIResult(row: blogCategoryRow): categoryAPIResult {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? row.created_at,
    revisedAt: row.revised_at ?? row.updated_at,
    name: row.name,
  }
}

function toContentsAPIResult(row: blogContentRow, categories: categoryAPIResult[]): contentsAPIResult {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? row.created_at,
    revisedAt: row.revised_at ?? row.updated_at,
    title: row.title,
    content: toDeliveryHTML(row.content, row.content_format),
    ogp_image: row.ogp_image ?? undefined,
    categories,
    is_secret: row.is_secret === 1,
    // secret_code / sns_text はクライアントへ渡す型に含めない（micro_cms.ts の parseContentsAPIResult と同じ）
  } as contentsAPIResult // parsed_content / table_of_contents は index.ts が parse() 結果を代入する
}

async function getCategoriesByContentIDs(
  db: D1Database,
  contentIDs: string[]
): Promise<Map<string, categoryAPIResult[]>> {
  const map = new Map<string, categoryAPIResult[]>()
  if (contentIDs.length === 0) {
    return map
  }
  const placeholders = contentIDs.map((_, i) => `?${i + 1}`).join(', ')
  const result = await db
    .prepare(
      `SELECT r.content_id, c.*
       FROM blog_content_categories r
       JOIN blog_categories c ON c.id = r.category_id
       WHERE r.content_id IN (${placeholders})
       ORDER BY r.content_id, r.position`
    )
    .bind(...contentIDs)
    .all<blogCategoryRow & { content_id: string }>()

  for (const row of result.results) {
    const list = map.get(row.content_id) ?? []
    list.push(toCategoryAPIResult(row))
    map.set(row.content_id, list)
  }
  return map
}

async function assembleContents(db: D1Database, rows: blogContentRow[]): Promise<contentsAPIResult[]> {
  const categoryMap = await getCategoriesByContentIDs(
    db,
    rows.map((r) => r.id)
  )
  return rows.map((row) => toContentsAPIResult(row, categoryMap.get(row.id) ?? []))
}

export async function getBlogContentsFromD1(
  db: D1Database,
  offset: number,
  limit: number
): Promise<{ contents: contentsAPIResult[]; total: number }> {
  const countRow = await db
    .prepare(`SELECT COUNT(*) AS cnt FROM blog_contents WHERE status = 'PUBLISH' AND is_secret = 0`)
    .first<{ cnt: number }>()
  const total = countRow?.cnt ?? 0

  const rows = await db
    .prepare(
      `SELECT * FROM blog_contents WHERE status = 'PUBLISH' AND is_secret = 0
       ORDER BY published_at DESC LIMIT ?1 OFFSET ?2`
    )
    .bind(limit, offset)
    .all<blogContentRow>()

  return { contents: await assembleContents(db, rows.results), total }
}

// タグ（カテゴリ）AND絞り込み。microCMS の categories[contains]A[and]categories[contains]B 相当
export async function getBlogContentsByTagFromD1(
  db: D1Database,
  tagIDs: string[],
  offset: number,
  limit: number
): Promise<{ contents: contentsAPIResult[]; total: number }> {
  if (tagIDs.length === 0) {
    return { contents: [], total: 0 }
  }

  const placeholders = tagIDs.map((_, i) => `?${i + 1}`).join(', ')
  const matchCondition = `
    FROM blog_contents c
    JOIN blog_content_categories r ON r.content_id = c.id
    WHERE c.status = 'PUBLISH' AND c.is_secret = 0 AND r.category_id IN (${placeholders})
    GROUP BY c.id
    HAVING COUNT(DISTINCT r.category_id) = ?${tagIDs.length + 1}`

  const countRow = await db
    .prepare(`SELECT COUNT(*) AS cnt FROM (SELECT c.id ${matchCondition})`)
    .bind(...tagIDs, tagIDs.length)
    .first<{ cnt: number }>()
  const total = countRow?.cnt ?? 0

  const rows = await db
    .prepare(
      `SELECT c.* ${matchCondition}
       ORDER BY c.published_at DESC LIMIT ?${tagIDs.length + 2} OFFSET ?${tagIDs.length + 3}`
    )
    .bind(...tagIDs, tagIDs.length, limit, offset)
    .all<blogContentRow>()

  return { contents: await assembleContents(db, rows.results), total }
}

// 単体取得。is_secret の記事も返す（閲覧ゲートは pages 側で行う）
export async function getBlogContentFromD1(db: D1Database, articleID: string): Promise<contentsAPIResult> {
  const row = await db
    .prepare(`SELECT * FROM blog_contents WHERE id = ?1 AND status = 'PUBLISH'`)
    .bind(articleID)
    .first<blogContentRow>()
  if (!row) {
    throw new Error(`blog content not found: ${articleID}`)
  }
  const contents = await assembleContents(db, [row])
  return contents[0]
}

// 前後記事の取得。prev = 一つ前（古い方）、next = 一つあと（新しい方）
// 一覧系と同様に限定公開記事はナビに出さない（基準記事自身は限定公開でも前後は計算する）
// published_at が同時刻の記事でも順序が安定するよう id をタイブレークに使う
export async function getBlogAdjacentContentsFromD1(
  db: D1Database,
  articleID: string
): Promise<adjacentContentsResult> {
  const base = await db
    .prepare(
      `SELECT id, COALESCE(published_at, created_at) AS published_at
       FROM blog_contents WHERE id = ?1 AND status = 'PUBLISH'`
    )
    .bind(articleID)
    .first<{ id: string; published_at: string }>()
  // 未公開（下書きプレビュー等）は前後なしを返す
  if (!base) {
    return { prev: null, next: null }
  }

  const prev = await db
    .prepare(
      `SELECT id, title FROM blog_contents
       WHERE status = 'PUBLISH' AND is_secret = 0
         AND (COALESCE(published_at, created_at), id) < (?1, ?2)
       ORDER BY COALESCE(published_at, created_at) DESC, id DESC LIMIT 1`
    )
    .bind(base.published_at, base.id)
    .first<{ id: string; title: string }>()

  const next = await db
    .prepare(
      `SELECT id, title FROM blog_contents
       WHERE status = 'PUBLISH' AND is_secret = 0
         AND (COALESCE(published_at, created_at), id) > (?1, ?2)
       ORDER BY COALESCE(published_at, created_at) ASC, id ASC LIMIT 1`
    )
    .bind(base.published_at, base.id)
    .first<{ id: string; title: string }>()

  return { prev: prev ?? null, next: next ?? null }
}

// 限定公開記事のコード照合用メタ。secret_code を含むためクライアントへ渡さないこと
export async function getBlogSecretMetaFromD1(
  db: D1Database,
  articleID: string
): Promise<{ is_secret: boolean; secret_code: string | null }> {
  const row = await db
    .prepare(`SELECT is_secret, secret_code FROM blog_contents WHERE id = ?1 AND status = 'PUBLISH'`)
    .bind(articleID)
    .first<{ is_secret: number; secret_code: string | null }>()
  if (!row) {
    return { is_secret: false, secret_code: null }
  }
  return { is_secret: row.is_secret === 1, secret_code: row.secret_code }
}

export async function getBlogTagsFromD1(db: D1Database): Promise<categoryAPIResult[]> {
  const result = await db.prepare(`SELECT * FROM blog_categories ORDER BY sort_order`).all<blogCategoryRow>()
  return result.results.map(toCategoryAPIResult)
}

export async function getBlogInfoFromD1(db: D1Database): Promise<infoAPIResult[]> {
  const result = await db
    .prepare(`SELECT * FROM blog_info WHERE status = 'PUBLISH' ORDER BY created_at`)
    .all<blogInfoRow>()
  return result.results.map(
    (row) =>
      ({
        id: row.id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        publishedAt: row.published_at ?? row.created_at,
        revisedAt: row.revised_at ?? row.updated_at,
        page_pathname: row.page_pathname,
        title: row.title ?? undefined,
        main_text: toDeliveryHTML(row.main_text, row.main_text_format),
      }) as infoAPIResult // parsed_content / table_of_contents は index.ts が parse() 結果を代入する
  )
}

// key-value 行を集約して staticAPIResult 形状に組み立てる
// タイムスタンプ類（createdAt等）もインポート時に行として保存されている
export async function getBlogStaticFromD1(db: D1Database): Promise<staticAPIResult> {
  const result = await db.prepare(`SELECT key, value FROM blog_static`).all<{ key: string; value: string }>()
  const staticData: Record<string, string> = {}
  for (const row of result.results) {
    staticData[row.key] = row.value
  }
  return staticData as unknown as staticAPIResult
}

// --- KVプレビュー（draftKey互換） ---

export async function getBlogContentDraftFromKV(
  kv: KVNamespace,
  articleID: string,
  draftKey: string
): Promise<contentsAPIResult | null> {
  const record = await getBlogDraftRecord(kv, articleID, draftKey)
  if (!record) {
    return null
  }
  return toContentsAPIResult(record.row, record.categories.map(toCategoryAPIResult))
}

// プレビュー時の secret_meta（下書きの is_secret / secret_code を返す）
export async function getBlogSecretMetaFromDraft(
  kv: KVNamespace,
  articleID: string,
  draftKey: string
): Promise<{ is_secret: boolean; secret_code: string | null } | null> {
  const record = await getBlogDraftRecord(kv, articleID, draftKey)
  if (!record) {
    return null
  }
  return { is_secret: record.row.is_secret === 1, secret_code: record.row.secret_code }
}

async function getBlogDraftRecord(
  kv: KVNamespace,
  articleID: string,
  draftKey: string
): Promise<blogContentDraftRecord | null> {
  const raw = await kv.get(`draft_blog_${articleID}`)
  if (!raw) {
    return null
  }
  const record = JSON.parse(raw) as blogContentDraftRecord
  if (record.draftKey !== draftKey) {
    return null
  }
  return record
}

// テスト用に公開する
export { toContentsAPIResult, toCategoryAPIResult }
