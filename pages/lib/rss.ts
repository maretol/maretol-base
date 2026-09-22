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

// サイト側では p_option ごとに専用コンポーネント(リンクカード・埋め込み等)で描画しているが、
// フィードリーダー向けには素の HTML に落とす。埋め込み系は元 URL へのリンクにする
export function convertParsedContentToHtml(contents: ParsedContent[]) {
  return contents
    .map((content) => convertBlockToHtml(content))
    .filter((html) => html !== null)
    .join('\n')
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
  if (tag === 'hr') {
    return '<hr>'
  }
  if (['ul', 'ol', 'blockquote', 'table', 'div', 'pre'].includes(tag)) {
    return `<${tag}>${content.inner_html ?? ''}</${tag}>`
  }
  return `<${tag}>${content.inner_html ?? escapeXml(content.text)}</${tag}>`
}

function convertParagraphToHtml(content: ParsedContent): string | null {
  const pOption = content.p_option ?? 'normal'
  const subTexts = content.sub_texts ?? {}

  switch (pOption) {
    case 'normal':
      return `<p>${content.inner_html || escapeXml(content.text)}</p>`
    case 'image':
    case 'photo':
      return convertImageToHtml(content.text, subTexts.title, subTexts.caption)
    case 'cite_image': {
      // 引用画像は外部ホストの画像を直接埋め込まず、引用元へのリンクにする
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
    // 目次・ブロック制御・Google Maps 埋め込みはフィードでは表現しない
    case 'table_of_contents':
    case 'block_start':
    case 'block_end':
    case 'gmaps':
      return null
    default:
      // 未知のコマンド(/xxx)は本文として出さない
      return null
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
