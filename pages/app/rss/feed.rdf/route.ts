import { getCMSContents } from '@/lib/api/workers'
import { getHostname } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function GET() {
  const rdfTemplate = `<?xml version="1.0" encoding="UTF-8"?>`
  const host = getHostname()
  const offset = 0
  const limit = 20

  const { contents: articles } = await getCMSContents(offset, limit)

  const items = articles.map((article) => {
    const content = article.parsed_content
    const contentSentence = content
      .slice(0, 10)
      .map((c) => c.text)
      .join(' ')
    return convertToRssItem(article.title, article.id, article.publishedAt, contentSentence)
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
      <lastBuildDate>${lastBuildDate.toISOString()}</lastBuildDate>
      <copyright>© ${lastBuildDate.getFullYear()} Maretol</copyright>
      <generator>Maretol Base</generator>
      <pubDate>${new Date().toISOString()}</pubDate>
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

function convertToRssItem(title: string, id: string, publishedAt: string, content: string) {
  const host = getHostname()

  return `
      <item>
        <title>${escapeXml(title)}</title>
        <link>${escapeXml(`${host}/blog/${id}`)}</link>
        <description><![CDATA[${escapeCdata(content)}]]></description>
        <pubDate>${new Date(publishedAt).toISOString()}</pubDate>
      </item>`
}

// XML のテキストノードとして安全な形にする
function escapeXml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// CDATA セクション内に終端記号 "]]>" が現れると壊れるので、セクションを分割して逃がす
function escapeCdata(text: string) {
  return text.replace(/]]>/g, ']]]]><![CDATA[>')
}
