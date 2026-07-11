/**
 * microCMS からエクスポートした blog の JSON を D1 投入用の SQL（INSERT文）に変換するスクリプト
 *
 * 実行: tsx scripts/generate_blog_sql.ts [contents.json] [categories.json] [info.json] [static.json] [出力SQLファイル]
 *   - 省略時: ../tmp/blog_contents.json ../tmp/blog_category.json ../tmp/info.json ../tmp/static.json
 *             generated/blog_import.sql
 *
 * 投入: wrangler d1 execute maretol-cms --local --file=generated/blog_import.sql
 *
 * 方針（cms_design.md「5. microCMS からのデータインポート」）:
 * - ID・タイムスタンプは microCMS の値をそのまま保持する
 * - content_format は一律 'html'、status は一律 'PUBLISH'（Content API で取れるのは公開データのみ）
 * - blog_categories.sort_order はエクスポート時の並び順（= microCMS の手動並び順）を保持する
 * - static はオブジェクトの全キーを key-value 行に展開する
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

type MicroCMSTimestamps = {
  createdAt: string
  updatedAt: string
  publishedAt?: string
  revisedAt?: string
}

type MicroCMSCategory = MicroCMSTimestamps & { id: string; name: string }

type MicroCMSBlogContent = MicroCMSTimestamps & {
  id: string
  title: string
  content: string
  ogp_image?: string | null
  categories?: MicroCMSCategory[]
  sns_text?: string | null
  is_secret?: boolean
  secret_code?: string | null
}

type MicroCMSInfo = MicroCMSTimestamps & {
  id: string
  page_pathname: string
  title?: string | null
  main_text: string
}

function sqlString(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  return `'${value.replace(/'/g, "''")}'`
}

const scriptDir = import.meta.dirname
const contentsPath = resolve(process.argv[2] ?? resolve(scriptDir, '../../tmp/blog_contents.json'))
const categoriesPath = resolve(process.argv[3] ?? resolve(scriptDir, '../../tmp/blog_category.json'))
const infoPath = resolve(process.argv[4] ?? resolve(scriptDir, '../../tmp/info.json'))
const staticPath = resolve(process.argv[5] ?? resolve(scriptDir, '../../tmp/static.json'))
const outPath = resolve(process.argv[6] ?? resolve(scriptDir, '../generated/blog_import.sql'))

const contents = (JSON.parse(readFileSync(contentsPath, 'utf-8')) as { contents: MicroCMSBlogContent[] }).contents
const categoryMaster = (JSON.parse(readFileSync(categoriesPath, 'utf-8')) as { contents: MicroCMSCategory[] }).contents
const infoList = (JSON.parse(readFileSync(infoPath, 'utf-8')) as { contents: MicroCMSInfo[] }).contents
const staticData = JSON.parse(readFileSync(staticPath, 'utf-8')) as Record<string, string> & MicroCMSTimestamps

// カテゴリはマスタの並び順を優先し、記事内埋め込みのみのものは末尾に追加する
const categories = new Map<string, MicroCMSCategory>()
for (const c of categoryMaster) {
  categories.set(c.id, c)
}
for (const content of contents) {
  for (const cat of content.categories ?? []) {
    if (!categories.has(cat.id)) {
      categories.set(cat.id, cat)
    }
  }
}

const lines: string[] = [
  '-- blog データインポート（generate_blog_sql.ts により生成）',
  `-- 元データ: ${contentsPath}`,
  '',
]

let sortOrder = 0
for (const c of categories.values()) {
  lines.push(
    `INSERT OR REPLACE INTO blog_categories (id, name, sort_order, created_at, updated_at, published_at, revised_at) VALUES (` +
      [
        sqlString(c.id),
        sqlString(c.name),
        String(sortOrder++),
        sqlString(c.createdAt),
        sqlString(c.updatedAt),
        sqlString(c.publishedAt),
        sqlString(c.revisedAt),
      ].join(', ') +
      ');'
  )
}
lines.push('')

for (const c of contents) {
  lines.push(
    `INSERT OR REPLACE INTO blog_contents (id, title, content, content_format, ogp_image, sns_text, is_secret, secret_code, status, created_at, updated_at, published_at, revised_at) VALUES (` +
      [
        sqlString(c.id),
        sqlString(c.title),
        sqlString(c.content),
        `'html'`,
        sqlString(c.ogp_image ?? null),
        sqlString(c.sns_text ?? null),
        c.is_secret === true ? '1' : '0',
        sqlString(c.secret_code ?? null),
        `'PUBLISH'`,
        sqlString(c.createdAt),
        sqlString(c.updatedAt),
        sqlString(c.publishedAt),
        sqlString(c.revisedAt),
      ].join(', ') +
      ');'
  )
  ;(c.categories ?? []).forEach((cat, position) => {
    lines.push(
      `INSERT OR REPLACE INTO blog_content_categories (content_id, category_id, position) VALUES (` +
        [sqlString(c.id), sqlString(cat.id), String(position)].join(', ') +
        ');'
    )
  })
}
lines.push('')

for (const i of infoList) {
  lines.push(
    `INSERT OR REPLACE INTO blog_info (id, page_pathname, title, main_text, main_text_format, status, created_at, updated_at, published_at, revised_at) VALUES (` +
      [
        sqlString(i.id),
        sqlString(i.page_pathname),
        sqlString(i.title ?? null),
        sqlString(i.main_text),
        `'html'`,
        `'PUBLISH'`,
        sqlString(i.createdAt),
        sqlString(i.updatedAt),
        sqlString(i.publishedAt),
        sqlString(i.revisedAt),
      ].join(', ') +
      ');'
  )
}
lines.push('')

// static はオブジェクトの全キーを key-value 行に展開する（タイムスタンプ類も行として保持）
const staticUpdatedAt = staticData.updatedAt ?? new Date(0).toISOString()
for (const [key, value] of Object.entries(staticData)) {
  if (typeof value !== 'string') {
    continue
  }
  lines.push(
    `INSERT OR REPLACE INTO blog_static (key, value, updated_at) VALUES (` +
      [sqlString(key), sqlString(value), sqlString(staticUpdatedAt)].join(', ') +
      ');'
  )
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, lines.join('\n') + '\n')
console.log(`generated: ${outPath}`)
console.log(
  `  contents: ${contents.length}件 / categories: ${categories.size}件 / info: ${infoList.length}件 / static: ${Object.keys(staticData).length}キー`
)
