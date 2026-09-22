import { ParsedContent } from 'api-types'

// XML のテキストノード・属性値として安全な形にする
export function escapeXml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// CDATA セクション内に終端記号 "]]>" が現れると壊れるので、セクションを分割して逃がす
export function escapeCdata(text: string) {
  return text.replace(/]]>/g, ']]]]><![CDATA[>')
}

// 終了タグを持たない要素
const voidElements = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]

// サイト側では p_option ごとに専用コンポーネント(リンクカード・埋め込み等)で描画しているが、
// フィードリーダー向けには素の HTML に落とす。埋め込み系は元 URL へのリンクにする。
// サイト上でも描画されないブロック(null)は数に入れず、表示されるブロックの先頭 limit 件を返す
export function convertParsedContentToHtml(contents: ParsedContent[], limit?: number) {
  const blocks = contents.map((content) => convertBlockToHtml(content)).filter((html) => html !== null)
  return (limit === undefined ? blocks : blocks.slice(0, limit)).join('\n')
}

function convertBlockToHtml(content: ParsedContent): string | null {
  const tag = content.tag_name

  if (tag === 'p') {
    return convertParagraphToHtml(content)
  }
  if (/^h[1-6]$/.test(tag)) {
    // 見出しは目次用の <span class="index"> を含むので text から組み立てる
    return `<${tag}>${escapeXml(content.text)}</${tag}>`
  }
  if (voidElements.includes(tag)) {
    return `<${tag}>`
  }
  return `<${tag}>${content.inner_html || escapeXml(content.text)}</${tag}>`
}

// サイト上でしか描画できないコンテンツの代わりに置くプレースホルダー
function siteOnlyPlaceholder(label: string) {
  return `<p>(${escapeXml(label)}: サイトでのみ表示)</p>`
}

function convertParagraphToHtml(content: ParsedContent): string | null {
  const pOption = content.p_option ?? 'normal'
  const subTexts = content.sub_texts ?? {}

  switch (pOption) {
    case 'normal':
      return `<p>${content.inner_html || escapeXml(content.text)}</p>`
    case 'image':
      return convertImageToHtml(content.text, subTexts.title, subTexts.caption)
    case 'photo':
      // サイト側(image.tsx の content_photo)は caption のみ表示し、title は出さない
      return convertImageToHtml(content.text, undefined, subTexts.caption)
    case 'cite_image': {
      // サイト側(renderCiteImage)と同じく url と source が揃っていなければ非表示にする。
      // 引用画像は外部ホストの画像を直接埋め込まず、引用元(source)へのリンクにする
      if (!subTexts.url || !subTexts.source) return null
      return convertLinkToHtml(subTexts.source, subTexts.source_title || subTexts.source)
    }
    case 'nofetch_url':
      if (!subTexts.url) return null
      return convertLinkToHtml(subTexts.url, subTexts.title || subTexts.url)
    case 'my_site':
    case 'youtube':
    case 'twitter':
    case 'amazon':
    case 'url':
    case 'blog':
    case 'artifact':
    case 'comic':
    case 'illust_detail':
      return convertLinkToHtml(content.text, content.text)
    case 'empty':
    case 'br':
      return '<br>'
    // 目次・Google Maps 埋め込みはフィードでは表現できないので、存在が分かるプレースホルダーにする
    case 'table_of_contents':
      return siteOnlyPlaceholder('目次')
    case 'gmaps':
      return siteOnlyPlaceholder('Google マップ')
    // ブロック制御はサイト側でも描画されない
    case 'block_start':
    case 'block_end':
      return null
    default:
      // 未知のコマンド(/xxx)はサイト側(renderParagraph)と同じく通常段落として出す
      return `<p>${content.inner_html || escapeXml(content.text)}</p>`
  }
}

function convertImageToHtml(src: string, title?: string, caption?: string) {
  const img = `<img src="${escapeXml(src)}" alt="${escapeXml(title ?? '')}">`
  const captionText = [title, caption].filter((t) => !!t).join(' ')
  if (captionText === '') {
    return `<figure>${img}</figure>`
  }
  return `<figure>${img}<figcaption>${escapeXml(captionText)}</figcaption></figure>`
}

function convertLinkToHtml(href: string, label: string) {
  return `<p><a href="${escapeXml(href)}">${escapeXml(label)}</a></p>`
}
