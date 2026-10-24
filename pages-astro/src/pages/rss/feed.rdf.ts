import type { APIRoute } from 'astro'
import { cacheTag } from 'cache-tags'
import { getCMSContents } from '@/lib/api/cms'
import { cachePage } from '@/lib/cache'
import { FEED_ITEM_COUNT, buildRssFeed, formatRssDate } from '@/lib/rss'
import { getHostname } from '@/lib/site'

// RSS フィード（RSS 2.0）。最新の記事を載せる。本文の組み立ては lib/rss.ts の buildRssFeed()

export const GET: APIRoute = async ({ locals }) => {
  const host = getHostname()
  // 取得に失敗したときは例外のまま 500 にする（空のフィードをキャッシュさせない）
  const { contents: articles } = await getCMSContents(locals, 0, FEED_ITEM_COUNT)
  const { body, lastModified } = buildRssFeed(host, articles, new Date())

  const headers = new Headers({
    'Content-Type': 'application/rss+xml; charset=utf-8',
    // 載せた記事の公開・更新のうち最新の時刻。リーダーの If-Modified-Since に対して、変わっていないことを伝えられるようにする
    'Last-Modified': formatRssDate(lastModified),
  })
  // エッジにだけキャッシュさせる。フィードリーダーには保持させず、毎回エッジに確かめさせる（ほかのページと同じ）
  cachePage({ headers }, [cacheTag.blog, cacheTag.blogList])
  return new Response(body, { headers })
}
