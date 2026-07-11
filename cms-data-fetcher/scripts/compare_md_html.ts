/**
 * Markdown変換の互換性確認ツール
 *
 * Markdownファイルを md-converter → parse() に通した結果と、
 * 現行CMS出力のHTMLファイルを parse() に通した結果を ParsedContent レベルで比較し、
 * 差分をレポートする。pages が実際に受け取る構造での比較なので、
 * HTML文字列の整形差（改行・インデント）はノイズとして正規化される
 *
 * 実行: npx tsx scripts/compare_md_html.ts [markdownファイル] [HTMLファイル]
 *       （省略時: ../tmp/test.md ../tmp/test.html）
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { convertMarkdownToHtml } from 'md-converter'
import { parse } from '../src/parse'
import type { ParsedContent } from 'api-types'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const mdPath = resolve(process.argv[2] ?? resolve(scriptDir, '../../tmp/test.md'))
const htmlPath = resolve(process.argv[3] ?? resolve(scriptDir, '../../tmp/test.html'))

// --- 正規化 ---

// テキスト: 整形由来の空白・改行の差を吸収する（連続空白を1つに）
function normText(s: string | undefined | null): string {
  return (s ?? '').replace(/\s+/g, ' ').trim()
}

// inner_html: 連続空白を潰した上で、タグ境界に挟まった整形用スペースを除去する
function normHtml(s: string | undefined | null): string {
  return (s ?? '')
    .replace(/\s+/g, ' ')
    .replace(/> /g, '>')
    .replace(/ </g, '<')
    .trim()
}

function normSubTexts(sub: { [key: string]: string } | null | undefined): Record<string, string> | null {
  if (!sub) return null
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(sub)) {
    out[k] = normText(v)
  }
  return out
}

// id は生成方式が異なる（microCMS のハッシュ vs FNV-1a）ため比較から除外する
function normAttrs(attrs: { [name: string]: string }): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (k === 'id') continue
    out[k] = v
  }
  return out
}

// --- ブロックの対応付け（LCS） ---

// tag_name + 正規化テキストが一致するブロック同士を対応付ける
function signature(c: ParsedContent): string {
  return `${c.tag_name}|${normText(c.text)}`
}

type Aligned =
  | { kind: 'pair'; md: ParsedContent; html: ParsedContent }
  | { kind: 'md-only'; md: ParsedContent }
  | { kind: 'html-only'; html: ParsedContent }

function align(mdBlocks: ParsedContent[], htmlBlocks: ParsedContent[]): Aligned[] {
  const n = mdBlocks.length
  const m = htmlBlocks.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        signature(mdBlocks[i]) === signature(htmlBlocks[j])
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const result: Aligned[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (signature(mdBlocks[i]) === signature(htmlBlocks[j])) {
      result.push({ kind: 'pair', md: mdBlocks[i++], html: htmlBlocks[j++] })
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ kind: 'md-only', md: mdBlocks[i++] })
    } else {
      result.push({ kind: 'html-only', html: htmlBlocks[j++] })
    }
  }
  while (i < n) result.push({ kind: 'md-only', md: mdBlocks[i++] })
  while (j < m) result.push({ kind: 'html-only', html: htmlBlocks[j++] })

  // 隣接する md-only + html-only で同じタグのものは「内容が変わった同一ブロック」として対にする
  const merged: Aligned[] = []
  for (const item of result) {
    const prev = merged[merged.length - 1]
    if (
      item.kind === 'html-only' &&
      prev?.kind === 'md-only' &&
      prev.md.tag_name === item.html.tag_name
    ) {
      merged[merged.length - 1] = { kind: 'pair', md: prev.md, html: item.html }
      continue
    }
    if (item.kind === 'md-only' && prev?.kind === 'html-only' && prev.html.tag_name === item.md.tag_name) {
      merged[merged.length - 1] = { kind: 'pair', md: item.md, html: prev.html }
      continue
    }
    merged.push(item)
  }
  return merged
}

// --- 比較 ---

function summarize(c: ParsedContent): string {
  const text = normText(c.text)
  const label = text !== '' ? text : normHtml(c.inner_html) !== '' ? `(inner: ${normHtml(c.inner_html).slice(0, 40)}...)` : '(空)'
  return `<${c.tag_name}> ${label.length > 60 ? label.slice(0, 60) + '…' : label}`
}

function compareBlock(md: ParsedContent, html: ParsedContent): string[] {
  const diffs: string[] = []
  if (md.tag_name !== html.tag_name) {
    diffs.push(`tag_name: md=<${md.tag_name}> html=<${html.tag_name}>`)
  }
  if (normText(md.text) !== normText(html.text)) {
    diffs.push(`text:\n      md  ="${normText(md.text)}"\n      html="${normText(html.text)}"`)
  }
  if ((md.p_option ?? null) !== (html.p_option ?? null)) {
    diffs.push(`p_option: md=${md.p_option} html=${html.p_option}`)
  }
  const mdSub = JSON.stringify(normSubTexts(md.sub_texts))
  const htmlSub = JSON.stringify(normSubTexts(html.sub_texts))
  if (mdSub !== htmlSub) {
    diffs.push(`sub_texts:\n      md  =${mdSub}\n      html=${htmlSub}`)
  }
  const mdAttrs = JSON.stringify(normAttrs(md.attributes))
  const htmlAttrs = JSON.stringify(normAttrs(html.attributes))
  if (mdAttrs !== htmlAttrs) {
    diffs.push(`attributes(id除く): md=${mdAttrs} html=${htmlAttrs}`)
  }
  const mdInner = normHtml(md.inner_html)
  const htmlInner = normHtml(html.inner_html)
  if (mdInner !== htmlInner) {
    diffs.push(`inner_html:\n      md  ="${mdInner.slice(0, 200)}${mdInner.length > 200 ? '…' : ''}"\n      html="${htmlInner.slice(0, 200)}${htmlInner.length > 200 ? '…' : ''}"`)
  }
  return diffs
}

// --- 実行 ---

const mdSource = readFileSync(mdPath, 'utf-8')
const htmlSource = readFileSync(htmlPath, 'utf-8')

const fromMd = parse(convertMarkdownToHtml(mdSource))
const fromHtml = parse(htmlSource)

console.log(`markdown: ${mdPath} → ブロック数 ${fromMd.contents_array.length}`)
console.log(`html:     ${htmlPath} → ブロック数 ${fromHtml.contents_array.length}`)
console.log()

let okCount = 0
let diffCount = 0
let onlyCount = 0

console.log('=== ブロック比較 ===')
const aligned = align(fromMd.contents_array, fromHtml.contents_array)
aligned.forEach((item, idx) => {
  const no = String(idx + 1).padStart(3, '0')
  if (item.kind === 'md-only') {
    onlyCount++
    console.log(`[MDのみ]   ${no} ${summarize(item.md)}`)
    return
  }
  if (item.kind === 'html-only') {
    onlyCount++
    console.log(`[HTMLのみ] ${no} ${summarize(item.html)}`)
    return
  }
  const diffs = compareBlock(item.md, item.html)
  if (diffs.length === 0) {
    okCount++
    console.log(`[OK]       ${no} ${summarize(item.md)}`)
  } else {
    diffCount++
    console.log(`[DIFF]     ${no} ${summarize(item.md)}`)
    diffs.forEach((d) => console.log(`    - ${d}`))
  }
})

console.log()
console.log('=== 目次 (table_of_contents) ===')
const mdToc = fromMd.table_of_contents.map((t) => `L${t.level} ${normText(t.title)}`)
const htmlToc = fromHtml.table_of_contents.map((t) => `L${t.level} ${normText(t.title)}`)
const tocMax = Math.max(mdToc.length, htmlToc.length)
let tocDiff = 0
for (let k = 0; k < tocMax; k++) {
  const a = mdToc[k] ?? '(なし)'
  const b = htmlToc[k] ?? '(なし)'
  if (a === b) {
    console.log(`[OK]   ${a}`)
  } else {
    tocDiff++
    console.log(`[DIFF] md="${a}" html="${b}"`)
  }
}

console.log()
console.log('=== 注釈 (annotations) ===')
const mdAnn = (fromMd.annotations ?? []).map((a) => `[${a.number}] ${normText(a.text)}`)
const htmlAnn = (fromHtml.annotations ?? []).map((a) => `[${a.number}] ${normText(a.text)}`)
const annMax = Math.max(mdAnn.length, htmlAnn.length)
let annDiff = 0
for (let k = 0; k < annMax; k++) {
  const a = mdAnn[k] ?? '(なし)'
  const b = htmlAnn[k] ?? '(なし)'
  if (a === b) {
    console.log(`[OK]   ${a}`)
  } else {
    annDiff++
    console.log(`[DIFF] md="${a}" html="${b}"`)
  }
}

console.log()
console.log('=== サマリ ===')
console.log(`ブロック: OK ${okCount} / DIFF ${diffCount} / 片側のみ ${onlyCount}`)
console.log(`目次: DIFF ${tocDiff} / 注釈: DIFF ${annDiff}`)

process.exit(diffCount + onlyCount + tocDiff + annDiff > 0 ? 1 : 0)
