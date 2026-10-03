import type { MiddlewareHandler } from 'hono'
import { setNoStore } from '../lib/cache'

// キャッシュヘッダの安全側の既定値を決める。
// Workers Cache は Cache-Control が無い 200 を既定で 2 時間キャッシュするため、
// ページが lib/cache.ts の cachePage() で明示したレスポンスだけがキャッシュされるようにする（astro_design.md 4.1）
export function cacheHeaders(): MiddlewareHandler {
  return async (c, next) => {
    await next()

    const url = new URL(c.req.url)
    const cacheable =
      (c.req.method === 'GET' || c.req.method === 'HEAD') &&
      // 下書きプレビューは URL ごとに内容が変わり、保存操作でパージもされない
      !url.searchParams.has('draftKey') &&
      c.res.status < 500 &&
      c.res.headers.has('Cloudflare-CDN-Cache-Control')

    if (!cacheable) {
      setNoStore(c.res.headers)
    }
  }
}
