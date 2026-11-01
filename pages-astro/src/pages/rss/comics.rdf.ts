import type { APIRoute } from 'astro'
import { cacheTag } from 'cache-tags'
import { getBandeDessinees } from '@/lib/api/cms'
import { FEED_ITEM_COUNT, buildRssFeed, comicFeedItem, rssResponse } from '@/lib/rss'
import { getHostname, SITE_NAME } from '@/lib/site'

// 漫画の RSS フィード（RSS 2.0）。最新の漫画を載せる。ブログの feed.rdf.ts と同じ作りで、漫画の保存（list:comics のパージ）で更新される

export const GET: APIRoute = async () => {
  const host = getHostname()
  // 取得に失敗したときは例外のまま 500 にする（空のフィードをキャッシュさせない）
  const { bandeDessinees } = await getBandeDessinees(0, FEED_ITEM_COUNT)
  const channel = { title: `Comics | ${SITE_NAME}`, link: `${host}/comics`, description: 'maretolの漫画の一覧です' }
  const feed = buildRssFeed(
    channel,
    bandeDessinees.map((comic) => comicFeedItem(host, comic)),
    new Date(),
  )
  return rssResponse(feed, [cacheTag.comicList])
}
