/**
 * microCMS からエクスポートした comic の JSON を D1 投入用の SQL（INSERT文）に変換するスクリプト
 *
 * 実行: tsx scripts/generate_comic_sql.ts [bande-dessinee.json] [tag.json] [series.json] [出力SQLファイル]
 *   - 省略時: ../tmp/bande-dessinee.json ../tmp/bande-dessinee_tag.json ../tmp/bande-dessinee_series.json
 *             generated/comic_import.sql
 *
 * 投入: wrangler d1 execute maretol-cms --local --file=generated/comic_import.sql
 *
 * 方針（cms_design.md「5. microCMS からのデータインポート」）:
 * - ID・タイムスタンプは microCMS の値をそのまま保持する
 * - description_format は一律 'html'、status は一律 'PUBLISH'（Content API で取れるのは公開データのみ）
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

type MicroCMSTimestamps = {
  createdAt: string
  updatedAt: string
  publishedAt?: string
  revisedAt?: string
}

type MicroCMSComicTag = MicroCMSTimestamps & { id: string; tag_name: string }
type MicroCMSComicSeries = MicroCMSTimestamps & { id: string; series_name: string }

type MicroCMSComic = MicroCMSTimestamps & {
  id: string
  title_name: string
  publish_date?: string | null
  publish_event?: string | null
  contents_url: string
  next_id?: string | null
  previous_id?: string | null
  tag: MicroCMSComicTag
  series?: MicroCMSComicSeries | null
  cover?: string | null
  back_cover?: string | null
  format: string[]
  filename: string
  first_page: number
  last_page: number
  first_left_right: string[]
  description?: string | null
}

function sqlString(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  return `'${value.replace(/'/g, "''")}'`
}

const scriptDir = import.meta.dirname
const comicPath = resolve(process.argv[2] ?? resolve(scriptDir, '../../tmp/bande-dessinee.json'))
const tagPath = resolve(process.argv[3] ?? resolve(scriptDir, '../../tmp/bande-dessinee_tag.json'))
const seriesPath = resolve(process.argv[4] ?? resolve(scriptDir, '../../tmp/bande-dessinee_series.json'))
const outPath = resolve(process.argv[5] ?? resolve(scriptDir, '../generated/comic_import.sql'))

const comics = (JSON.parse(readFileSync(comicPath, 'utf-8')) as { contents: MicroCMSComic[] }).contents
const tagMaster = (JSON.parse(readFileSync(tagPath, 'utf-8')) as { contents: MicroCMSComicTag[] }).contents
const seriesMaster = (JSON.parse(readFileSync(seriesPath, 'utf-8')) as { contents: MicroCMSComicSeries[] }).contents

// マスタと記事内埋め込みの和集合を取る（マスタ側を優先）
const tags = new Map<string, MicroCMSComicTag>()
const seriesMap = new Map<string, MicroCMSComicSeries>()
for (const c of comics) {
  if (c.tag) tags.set(c.tag.id, c.tag)
  if (c.series) seriesMap.set(c.series.id, c.series)
}
for (const t of tagMaster) tags.set(t.id, t)
for (const s of seriesMaster) seriesMap.set(s.id, s)

const lines: string[] = [
  '-- comic データインポート（generate_comic_sql.ts により生成）',
  `-- 元データ: ${comicPath}`,
  '',
]

for (const t of tags.values()) {
  lines.push(
    `INSERT OR REPLACE INTO bande_dessinee_tags (id, tag_name, created_at, updated_at, published_at, revised_at) VALUES (` +
      [sqlString(t.id), sqlString(t.tag_name), sqlString(t.createdAt), sqlString(t.updatedAt), sqlString(t.publishedAt), sqlString(t.revisedAt)].join(
        ', '
      ) +
      ');'
  )
}
lines.push('')

for (const s of seriesMap.values()) {
  lines.push(
    `INSERT OR REPLACE INTO bande_dessinee_series (id, series_name, created_at, updated_at, published_at, revised_at) VALUES (` +
      [
        sqlString(s.id),
        sqlString(s.series_name),
        sqlString(s.createdAt),
        sqlString(s.updatedAt),
        sqlString(s.publishedAt),
        sqlString(s.revisedAt),
      ].join(', ') +
      ');'
  )
}
lines.push('')

for (const c of comics) {
  lines.push(
    `INSERT OR REPLACE INTO bande_dessinees (id, title_name, publish_date, publish_event, contents_url, next_id, previous_id, tag_id, series_id, cover, back_cover, format, filename, first_page, last_page, first_left_right, description, description_format, status, created_at, updated_at, published_at, revised_at) VALUES (` +
      [
        sqlString(c.id),
        sqlString(c.title_name),
        sqlString(c.publish_date ?? null),
        sqlString(c.publish_event ?? null),
        sqlString(c.contents_url),
        sqlString(c.next_id ?? null),
        sqlString(c.previous_id ?? null),
        sqlString(c.tag.id),
        sqlString(c.series?.id ?? null),
        sqlString(c.cover ?? null),
        sqlString(c.back_cover ?? null),
        sqlString(JSON.stringify(c.format ?? [])),
        sqlString(c.filename),
        String(c.first_page),
        String(c.last_page),
        sqlString(JSON.stringify(c.first_left_right ?? [])),
        sqlString(c.description ?? ''),
        `'html'`,
        `'PUBLISH'`,
        sqlString(c.createdAt),
        sqlString(c.updatedAt),
        sqlString(c.publishedAt),
        sqlString(c.revisedAt),
      ].join(', ') +
      ');'
  )
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, lines.join('\n') + '\n')
console.log(`generated: ${outPath}`)
console.log(`  comics: ${comics.length}件 / tags: ${tags.size}件 / series: ${seriesMap.size}件`)
