import type { ParsedContent, contentsAPIResult } from 'api-types'

// RSS フィードの本文を組み立てる。各ブロックの HTML への変換と、フィード全体（channel / item）の組み立て

// XML のテキストノード・属性値として安全な形にする
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// CDATA セクション内に終端記号 "]]>" が現れると壊れるので、セクションを分割して逃がす
export function escapeCdata(text: string): string {
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
export function convertParsedContentToHtml(contents: ParsedContent[], limit?: number): string {
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
function siteOnlyPlaceholder(label: string): string {
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
      // サイト側（blocks/ContentImage.astro の photo）は caption のみ表示し、title は出さない
      return convertImageToHtml(content.text, undefined, subTexts.caption)
    case 'cite_image': {
      // サイト側（blocks/Block.astro）と同じく url と source が揃っていなければ非表示にする。
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
      // 未知のコマンド(/xxx)はサイト側（blocks/Block.astro）と同じく通常段落として出す
      return `<p>${content.inner_html || escapeXml(content.text)}</p>`
  }
}

function convertImageToHtml(src: string, title?: string, caption?: string): string {
  const img = `<img src="${escapeXml(src)}" alt="${escapeXml(title ?? '')}">`
  const captionText = [title, caption].filter((t) => !!t).join(' ')
  if (captionText === '') {
    return `<figure>${img}</figure>`
  }
  return `<figure>${img}<figcaption>${escapeXml(captionText)}</figcaption></figure>`
}

function convertLinkToHtml(href: string, label: string): string {
  return `<p><a href="${escapeXml(href)}">${escapeXml(label)}</a></p>`
}

// --- フィード全体の組み立て ---

// フィードに載せる記事。一覧の取得結果のうち、組み立てに使う項目だけ
export type FeedArticle = Pick<contentsAPIResult, 'id' | 'title' | 'publishedAt' | 'revisedAt' | 'parsed_content'>

// 載せる記事の件数
export const FEED_ITEM_COUNT = 20
// description に含める本文のブロック数（記事の冒頭だけを載せる）
const DESCRIPTION_BLOCK_COUNT = 10

// RSS 2.0 の pubDate / lastBuildDate は RFC 822 形式。HTTP の Last-Modified も同じ形式
export function formatRssDate(date: Date): string {
  return date.toUTCString()
}

// 日時の文字列のうち最も新しいもの
function latestDate(dates: string[]): Date {
  return new Date(Math.max(...dates.map((date) => new Date(date).getTime())))
}

// RSS フィード（RSS 2.0）の本文と、内容が最後に変わった時刻（Last-Modified に使う）。
// 本文には描画した時刻を入れず、記事の時刻だけから組み立てる。エッジのキャッシュは Worker のバージョン単位で
// デプロイのたびに空になるので、描画した時刻を入れるとデプロイだけで本文が変わり、リーダーがフィードの更新と判定する（#1420）。
// now は記事が 1 件も無いときの時刻にだけ使う
export function buildRssFeed(host: string, articles: FeedArticle[], now: Date): { body: string; lastModified: Date } {
  // channel の pubDate は最新の記事の公開時刻。lastBuildDate は載せた記事の公開・更新のうち最新の時刻（記事を直すと進む）
  const latestPublished = articles.length > 0 ? latestDate(articles.map((article) => article.publishedAt)) : now
  const lastModified =
    articles.length > 0 ? latestDate(articles.flatMap((article) => [article.publishedAt, article.revisedAt])) : now

  const items = articles.map((article) => {
    const link = `${host}/blog/${article.id}`
    const description = convertParsedContentToHtml(article.parsed_content, DESCRIPTION_BLOCK_COUNT)
    // guid は記事の URL。リーダーは guid で同じ記事かを判定するので、description の HTML が変わっても別の記事にはならない
    return `
      <item>
        <title>${escapeXml(article.title)}</title>
        <link>${escapeXml(link)}</link>
        <guid isPermaLink="true">${escapeXml(link)}</guid>
        <description><![CDATA[${escapeCdata(description)}]]></description>
        <pubDate>${formatRssDate(new Date(article.publishedAt))}</pubDate>
      </item>`
  })

  const body = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0" xml:lang="ja">
    <channel>
      <language>ja</language>
      <title>Maretol Base</title>
      <link>${escapeXml(host)}</link>
      <description>maretolの個人サイトです</description>
      <lastBuildDate>${formatRssDate(lastModified)}</lastBuildDate>
      <copyright>© ${latestPublished.getFullYear()} Maretol</copyright>
      <generator>Maretol Base</generator>
      <pubDate>${formatRssDate(latestPublished)}</pubDate>
      <ttl>60</ttl>
      ${items.join('')}
    </channel>
  </rss>`

  return { body, lastModified }
}
