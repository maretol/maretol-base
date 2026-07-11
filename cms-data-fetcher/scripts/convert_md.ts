/**
 * Markdownファイルを md-converter で変換し、結果を標準出力に表示する確認用ツール
 *
 * 実行: npx tsx scripts/convert_md.ts [markdownファイル] [--parsed]
 *   - 省略時: ../tmp/test.md
 *   - --parsed を付けると変換後HTMLをさらに parse() に通した ParsedContent（pagesが受け取る構造）をJSONで出力する
 *
 * 例: npx tsx scripts/convert_md.ts ../tmp/test.md > /tmp/out.html
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { convertMarkdownToHtml } from 'md-converter'
import { parse } from '../src/parse'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const showParsed = args.includes('--parsed')
const fileArg = args.find((a) => !a.startsWith('--'))
const mdPath = resolve(fileArg ?? resolve(scriptDir, '../../tmp/test.md'))

const html = convertMarkdownToHtml(readFileSync(mdPath, 'utf-8'))

if (showParsed) {
  console.log(JSON.stringify(parse(html), null, 2))
} else {
  console.log(html)
}
