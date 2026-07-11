/**
 * microCMS Content API から全件エクスポートして JSON ファイルに保存するスクリプト
 *
 * 実行: CMS_API_KEY_AT=xxx tsx scripts/export_microcms.ts illust [出力ディレクトリ]
 *   - サービス名: illust | comic | blog（現状 illust のみ実装。段階移行に合わせて追加する）
 *   - 出力ディレクトリ省略時: ../tmp/export
 *
 * 公開データのみ取得できる（Content API の仕様）。下書きは対象外とし、必要なら手動で移す
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

type ExportTarget = {
  serviceDomain: string
  endpoints: string[]
  apiKeyEnv: string
}

const TARGETS: Record<string, ExportTarget> = {
  illust: {
    serviceDomain: 'maretol-illust',
    endpoints: ['atelier', 'categories'],
    apiKeyEnv: 'CMS_API_KEY_AT',
  },
  comic: {
    serviceDomain: 'maretol-comic',
    endpoints: ['bande-dessinee', 'tag', 'series'],
    apiKeyEnv: 'CMS_API_KEY_BD',
  },
  blog: {
    serviceDomain: 'maretol-blog',
    endpoints: ['contents', 'categories', 'info', 'static'],
    apiKeyEnv: 'CMS_API_KEY',
  },
}

const PAGE_LIMIT = 100

async function fetchAll(serviceDomain: string, endpoint: string, apiKey: string): Promise<unknown> {
  const baseURL = `https://${serviceDomain}.microcms.io/api/v1/${endpoint}`
  const headers = { 'X-MICROCMS-API-KEY': apiKey }

  // オブジェクト形式API（static等）はリスト形式のパラメータを受け付けないため、まず素で取得して判定する
  const first = await fetch(`${baseURL}?limit=${PAGE_LIMIT}`, { headers })
  if (!first.ok) {
    throw new Error(`fetch failed: ${endpoint} ${first.status} ${await first.text()}`)
  }
  const firstJSON = (await first.json()) as { contents?: unknown[]; totalCount?: number }
  if (!Array.isArray(firstJSON.contents)) {
    // オブジェクト形式APIはそのまま返す
    return firstJSON
  }

  const all = [...firstJSON.contents]
  const total = firstJSON.totalCount ?? all.length
  while (all.length < total) {
    const res = await fetch(`${baseURL}?limit=${PAGE_LIMIT}&offset=${all.length}`, { headers })
    if (!res.ok) {
      throw new Error(`fetch failed: ${endpoint} offset=${all.length} ${res.status}`)
    }
    const json = (await res.json()) as { contents: unknown[] }
    if (json.contents.length === 0) {
      break
    }
    all.push(...json.contents)
  }
  return { contents: all, totalCount: total }
}

const service = process.argv[2]
const outDir = resolve(process.argv[3] ?? resolve(import.meta.dirname, '../../tmp/export'))

const target = TARGETS[service]
if (!target) {
  console.error(`usage: tsx scripts/export_microcms.ts <${Object.keys(TARGETS).join('|')}> [outDir]`)
  process.exit(1)
}
const apiKey = process.env[target.apiKeyEnv]
if (!apiKey) {
  console.error(`環境変数 ${target.apiKeyEnv} が設定されていません`)
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })
for (const endpoint of target.endpoints) {
  const data = await fetchAll(target.serviceDomain, endpoint, apiKey)
  const outPath = resolve(outDir, `${service}_${endpoint.replace(/-/g, '_')}.json`)
  writeFileSync(outPath, JSON.stringify(data, null, 2))
  const count = Array.isArray((data as { contents?: unknown[] }).contents)
    ? (data as { contents: unknown[] }).contents.length
    : 1
  console.log(`exported: ${outPath} (${count}件)`)
}
