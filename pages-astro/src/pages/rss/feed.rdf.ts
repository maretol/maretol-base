import type { APIRoute } from 'astro'
import { cacheTag } from 'cache-tags'
import { getCMSContents } from '@/lib/api/cms'
import { cachePage } from '@/lib/cache'
import { convertParsedContentToHtml, escapeCdata, escapeXml } from '@/lib/rss'
import { getHostname } from '@/lib/site'

// RSS フィード（RSS 2.0）。最新の記事を載せる

// 載せる記事の件数
const ITEM_COUNT = 20
// description に含める本文のブロック数（記事の冒頭だけを載せる）
const DESCRIPTION_BLOCK_COUNT = 10
// フィードリーダー側で保持させる秒数。エッジのキャッシュは記事の保存でパージされる
const CLIENT_MAX_AGE = 60 * 60

// RSS 2.0 の pubDate / lastBuildDate は RFC 822 形式
function formatRssDate(date: Date): string {
  return date.toUTCString()
}

export const GET: APIRoute = async ({ locals }) => {
  const host = getHostname()
  // 取得に失敗したときは例外のまま 500 にする（空のフィードをキャッシュさせない）
  const { contents: articles } = await getCMSContents(locals, 0, ITEM_COUNT)

  const items = articles.map((article) => {
    const description = convertParsedContentToHtml(article.parsed_content, DESCRIPTION_BLOCK_COUNT)
    return `
      <item>
        <title>${escapeXml(article.title)}</title>
        <link>${escapeXml(`${host}/blog/${article.id}`)}</link>
        <description><![CDATA[${escapeCdata(description)}]]></description>
        <pubDate>${formatRssDate(new Date(article.publishedAt))}</pubDate>
      </item>`
  })

  // 記事が 1 件も無いときは現在時刻を使う
  const lastBuildDate = new Date(articles[0]?.publishedAt ?? Date.now())

  const body = `<?xml version="1.0" encoding="UTF-8"?>
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

  const headers = new Headers({ 'Content-Type': 'application/rss+xml; charset=utf-8' })
  cachePage({ headers }, [cacheTag.blog, cacheTag.blogList])
  // フィードリーダーには現行と同じく 1 時間保持させる（エッジは Cloudflare-CDN-Cache-Control を見る）
  headers.set('Cache-Control', `public, max-age=${CLIENT_MAX_AGE}`)
  return new Response(body, { headers })
}
