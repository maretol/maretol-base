import type { APIRoute } from 'astro'
import { cacheTag } from 'cache-tags'
import { getCMSContents } from '@/lib/api/cms'
import { FEED_ITEM_COUNT, blogFeedItem, buildRssFeed, rssResponse } from '@/lib/rss'
import { getHostname, SITE_NAME } from '@/lib/site'

// ブログの RSS フィード（RSS 2.0）。最新の記事を載せる。本文の組み立てとレスポンスは lib/rss.ts

export const GET: APIRoute = async ({ locals }) => {
  const host = getHostname()
  // 取得に失敗したときは例外のまま 500 にする（空のフィードをキャッシュさせない）
  const { contents: articles } = await getCMSContents(locals, 0, FEED_ITEM_COUNT)
  const channel = { title: SITE_NAME, link: host, description: 'maretolの個人サイトです' }
  const feed = buildRssFeed(
    channel,
    articles.map((article) => blogFeedItem(host, article)),
    new Date(),
  )
  return rssResponse(feed, [cacheTag.blog, cacheTag.blogList])
}
