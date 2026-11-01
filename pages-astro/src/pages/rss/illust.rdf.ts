import type { APIRoute } from 'astro'
import { cacheTag } from 'cache-tags'
import { getAteliers } from '@/lib/api/cms'
import { ILLUST_LIST_PATH, ILLUST_LIST_TITLE } from '@/lib/illust'
import { FEED_ITEM_COUNT, buildRssFeed, illustFeedItem, rssResponse } from '@/lib/rss'
import { getHostname } from '@/lib/site'

// イラストの RSS フィード（RSS 2.0）。最新のイラストを載せる。ブログの feed.rdf.ts と同じ作りで、イラストの保存（list:illust のパージ）で更新される

export const GET: APIRoute = async () => {
  const host = getHostname()
  // 取得に失敗したときは例外のまま 500 にする（空のフィードをキャッシュさせない）
  const { ateliers } = await getAteliers(0, FEED_ITEM_COUNT)
  const channel = {
    title: ILLUST_LIST_TITLE,
    link: `${host}${ILLUST_LIST_PATH}`,
    description: 'maretolのイラストの一覧です',
  }
  const feed = buildRssFeed(
    channel,
    ateliers.map((illust) => illustFeedItem(host, illust)),
    new Date(),
  )
  return rssResponse(feed, [cacheTag.illustList])
}
