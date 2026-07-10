/**
 * Markdown を現行CMS（microCMS リッチエディタ出力）互換の HTML へ変換する処理
 *
 * cms-data-fetcher が配信時に「Markdown → 互換HTML → parse()」と繋ぐことを前提とし、
 * 出力は microCMS が出力していた HTML の部分集合に合わせる（cms_design.md 参照）
 *
 * 独自拡張:
 * - 見出し末尾の `@@index_target` : 目次対象の指定。<span class="index"> で包む
 * - コードフェンスの info 文字列 `lang:filename` : <div data-filename="filename"> で包む
 */

import MarkdownIt from 'markdown-it'

type StateCore = Parameters<Parameters<MarkdownIt['core']['ruler']['push']>[1]>[0]

const INDEX_TARGET_MARKER = '@@index_target'

// インラインHTMLとして素通しを許可するタグ（テキスト装飾系のみ）
// iframe 等を許可しないのは、コマンド行（例: /gmaps@@iframe::<iframe ...>）のパラメータを
// parse() が要素の text() から抽出するため、タグが実要素化するとパラメータが失われるため。
// 許可外のタグはエスケープしてテキストとして保持する（microCMS エディタの挙動と同じ）
const ALLOWED_INLINE_TAGS = ['span', 'br', 'u', 's', 'sub', 'sup', 'ruby', 'rt', 'rp']
const allowedInlinePattern = new RegExp(`^</?(?:${ALLOWED_INLINE_TAGS.join('|')})(?:\\s[^>]*)?/?>$`, 'i')

// FNV-1a 32bit。見出しidを内容から決定的に生成するために使用する
function fnv1a(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

// 見出しの処理: 全見出しに決定的な id を付与し、@@index_target 指定があれば
// 内容を <span class="index"> で包む（microCMS の目次対象表現と互換）
function cmsHeadingRule(state: StateCore): void {
  const usedIds = new Set<string>()
  const tokens = state.tokens

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'heading_open') {
      continue
    }
    const inline = tokens[i + 1]
    if (!inline || inline.type !== 'inline') {
      continue
    }

    let isIndexTarget = false
    if (inline.content.trimEnd().endsWith(INDEX_TARGET_MARKER)) {
      isIndexTarget = true
      inline.content = inline.content.trimEnd().slice(0, -INDEX_TARGET_MARKER.length).trimEnd()
      // インライントークン側からもマーカーを除去する（末尾のtextトークンにあるはず）
      const children = inline.children ?? []
      for (let j = children.length - 1; j >= 0; j--) {
        const child = children[j]
        if (child.type === 'text' && child.content.includes(INDEX_TARGET_MARKER)) {
          child.content = child.content.replace(INDEX_TARGET_MARKER, '').trimEnd()
          break
        }
      }
    }

    // 同一テキストの見出しは同じ id になる。同一記事内で重複した場合のみサフィックスで変化させる
    let id = 'h' + fnv1a(inline.content)
    let suffix = 2
    while (usedIds.has(id)) {
      id = 'h' + fnv1a(`${inline.content}#${suffix}`)
      suffix++
    }
    usedIds.add(id)
    tokens[i].attrSet('id', id)

    if (isIndexTarget) {
      const open = new state.Token('html_inline', '', 0)
      open.content = '<span class="index">'
      const close = new state.Token('html_inline', '', 0)
      close.content = '</span>'
      inline.children = [open, ...(inline.children ?? []), close]
    }
  }
}

function createConverter(): MarkdownIt {
  const md = new MarkdownIt({
    html: true, // 生HTMLを許可（インラインは下記で装飾系タグのみに制限）
    breaks: true, // 単一改行を <br> にする（microCMS の shift+enter 相当）
    linkify: false, // URL自動リンク無効。単行URLはプレーンな <p> のまま出す（p_option 判定互換）
  })

  // cite:: 行の保護: 引用元記法 cite::[タイトル](URL) は pages 側が「生テキスト」を
  // 正規表現で解釈するため、Markdown のリンク記法として <a> に変換されると URL が失われる。
  // cite:: で始まる行は [ をエスケープしてリンク解釈を抑止し、リテラルのまま出力する
  md.core.ruler.before('inline', 'cms_protect_cite', (state) => {
    for (const token of state.tokens) {
      if (token.type !== 'inline' || !token.content.includes('cite::')) {
        continue
      }
      token.content = token.content
        .split('\n')
        .map((line) => (line.trimStart().startsWith('cite::') ? line.replace(/\[/g, '\\[') : line))
        .join('\n')
    }
  })

  md.core.ruler.push('cms_heading', cmsHeadingRule)

  // コードフェンス: info 文字列を `lang:filename` として解析し、
  // pages が描画できるトップレベル要素にするため常に <div> で包む
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx]
    const info = token.info ? md.utils.unescapeAll(token.info).trim() : ''
    const colonIndex = info.indexOf(':')
    const filename = colonIndex >= 0 ? info.slice(colonIndex + 1).trim() : ''
    const code = md.utils.escapeHtml(token.content)
    const filenameAttr = filename ? ` data-filename="${md.utils.escapeHtml(filename)}"` : ''
    return `<div${filenameAttr}><pre><code>${code}</code></pre></div>\n`
  }

  // インラインHTML: 装飾系タグのみ素通しし、それ以外はエスケープしてテキストとして保持する
  md.renderer.rules.html_inline = (tokens, idx) => {
    const content = tokens[idx].content
    return allowedInlinePattern.test(content) ? content : md.utils.escapeHtml(content)
  }

  return md
}

const converter = createConverter()

/**
 * Markdown を現行CMS互換の HTML に変換する
 */
export function convertMarkdownToHtml(markdown: string): string {
  return converter.render(markdown)
}
