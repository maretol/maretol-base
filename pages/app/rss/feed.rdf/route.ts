import { getCMSContents } from '@/lib/api/workers'
import { getHostname } from '@/lib/env'
import { convertParsedContentToHtml, escapeCdata, escapeXml } from '@/lib/rss'

export const dynamic = 'force-dynamic'

// description に含める本文ブロック数(記事冒頭のみを載せる)
const descriptionBlockCount = 10

// RSS 2.0 の pubDate / lastBuildDate は RFC 822 形式
function formatRssDate(date: Date) {
  return date.toUTCString()
}

export async function GET() {
  const rdfTemplate = `<?xml version="1.0" encoding="UTF-8"?>`
  const host = getHostname()
  const offset = 0
  const limit = 20

  const { contents: articles } = await getCMSContents(offset, limit)

  const items = articles.map((article) => {
    const description = convertParsedContentToHtml(article.parsed_content, descriptionBlockCount)
    return convertToRssItem(article.title, article.id, article.publishedAt, description)
  })

  // getCMSContents が失敗すると contents は空配列になるので、先頭要素がない場合は現在時刻を使う
  const lastBuildDate = new Date(articles[0]?.publishedAt ?? Date.now())

  const rssTemplate = `${rdfTemplate}
  <rss version="2.0" xml:lang="ja">
    <channel>
      <language>ja</language>
      <title>Maretol Base</title>
      <link>${escapeXml(host)}</link>
      <description>maretolの個人サイトです</description>
      <lastBuildDate>${formatRssDate(lastBuildDate)}</lastBuildDate>
      <copyright>© ${lastBuildDate.getFullYear()} Maretol</copyright>
      <generator>Maretol Base</generator>
      <pubDate>${formatRssDate(new Date())}</pubDate>
      <ttl>60</ttl>
      ${items.join('')}
    </channel>
  </rss>`

  return new Response(rssTemplate, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

function convertToRssItem(title: string, id: string, publishedAt: string, descriptionHtml: string) {
  const host = getHostname()

  return `
      <item>
        <title>${escapeXml(title)}</title>
        <link>${escapeXml(`${host}/blog/${id}`)}</link>
        <description><![CDATA[${escapeCdata(descriptionHtml)}]]></description>
        <pubDate>${formatRssDate(new Date(publishedAt))}</pubDate>
      </item>`
}
