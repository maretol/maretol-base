/**
 * microCMS からエクスポートした illust の JSON を D1 投入用の SQL（INSERT文）に変換するスクリプト
 *
 * 実行: tsx scripts/generate_illust_sql.ts [atelier.json] [tag.json] [出力SQLファイル]
 *   - 省略時: ../tmp/illust.json ../tmp/illust_tag.json generated/illust_import.sql
 *
 * 投入: wrangler d1 execute maretol-cms --local --file=generated/illust_import.sql
 *
 * 方針（cms_design.md「5. microCMS からのデータインポート」）:
 * - ID・タイムスタンプは microCMS の値をそのまま保持する
 * - description_format は一律 'html'、status は一律 'PUBLISH'（Content API で取れるのは公開データのみ）
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

type MicroCMSTag = {
  id: string
  tag: string
  type: string[]
  createdAt: string
  updatedAt: string
  publishedAt?: string
  revisedAt?: string
}

type MicroCMSAtelier = {
  id: string
  title: string
  src: string
  object_position?: string
  description?: string | null
  tag_or_category?: MicroCMSTag[]
  createdAt: string
  updatedAt: string
  publishedAt?: string
  revisedAt?: string
}

function sqlString(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  return `'${value.replace(/'/g, "''")}'`
}

const scriptDir = import.meta.dirname
const atelierPath = resolve(process.argv[2] ?? resolve(scriptDir, '../../tmp/illust.json'))
const tagPath = resolve(process.argv[3] ?? resolve(scriptDir, '../../tmp/illust_tag.json'))
const outPath = resolve(process.argv[4] ?? resolve(scriptDir, '../generated/illust_import.sql'))

const ateliers = (JSON.parse(readFileSync(atelierPath, 'utf-8')) as { contents: MicroCMSAtelier[] }).contents
const tagMaster = (JSON.parse(readFileSync(tagPath, 'utf-8')) as { contents: MicroCMSTag[] }).contents

// タグはマスタ（tag.json）と記事内埋め込みの和集合を取る（マスタ側を優先）
const tags = new Map<string, MicroCMSTag>()
for (const a of ateliers) {
  for (const t of a.tag_or_category ?? []) {
    tags.set(t.id, t)
  }
}
for (const t of tagMaster) {
  tags.set(t.id, t)
}

const lines: string[] = [
  '-- illust データインポート（generate_illust_sql.ts により生成）',
  `-- 元データ: ${atelierPath}`,
  '',
]

for (const t of tags.values()) {
  lines.push(
    `INSERT OR REPLACE INTO atelier_tags (id, tag, type, created_at, updated_at, published_at, revised_at) VALUES (` +
      [
        sqlString(t.id),
        sqlString(t.tag),
        sqlString(t.type?.[0] ?? ''),
        sqlString(t.createdAt),
        sqlString(t.updatedAt),
        sqlString(t.publishedAt),
        sqlString(t.revisedAt),
      ].join(', ') +
      ');'
  )
}
lines.push('')

for (const a of ateliers) {
  lines.push(
    `INSERT OR REPLACE INTO ateliers (id, title, src, object_position, description, description_format, status, created_at, updated_at, published_at, revised_at) VALUES (` +
      [
        sqlString(a.id),
        sqlString(a.title),
        sqlString(a.src),
        sqlString(a.object_position ?? 'center'),
        sqlString(a.description ?? null),
        `'html'`,
        `'PUBLISH'`,
        sqlString(a.createdAt),
        sqlString(a.updatedAt),
        sqlString(a.publishedAt),
        sqlString(a.revisedAt),
      ].join(', ') +
      ');'
  )
  ;(a.tag_or_category ?? []).forEach((t, position) => {
    lines.push(
      `INSERT OR REPLACE INTO atelier_tag_relations (atelier_id, tag_id, position) VALUES (` +
        [sqlString(a.id), sqlString(t.id), String(position)].join(', ') +
        ');'
    )
  })
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, lines.join('\n') + '\n')
console.log(`generated: ${outPath}`)
console.log(`  ateliers: ${ateliers.length}件 / tags: ${tags.size}件`)
