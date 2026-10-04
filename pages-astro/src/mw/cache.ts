import type { Context, MiddlewareHandler } from 'hono'
import { getFetchState } from 'astro/hono'
import { setNoStore, shortenForDegraded } from '../lib/cache'

// レスポンスのキャッシュヘッダを確定する（astro_design.md 4.1）
// - ページが lib/cache.ts の cachePage() で明示したレスポンスだけをキャッシュさせる。
//   Workers Cache は Cache-Control が無い 200 を既定で 2 時間キャッシュするため、それ以外は no-store にする
// - HTML は本文を最後まで描画してから返す。部品（リンクカードや画像など）の描画は本文のストリームを
//   読み進めるまで終わらず、その結果でステータスとヘッダを変えたいため。ストリームのまま返すと、
//   途中で例外が起きて切れた 200 や、取得に失敗した部品を含むページが 30 日キャッシュされる
export function cacheHeaders(): MiddlewareHandler {
  return async (c, next) => {
    await next()

    const url = new URL(c.req.url)
    let body: ArrayBuffer | null = null
    if (c.res.body && c.res.headers.get('Content-Type')?.includes('text/html')) {
      try {
        body = await c.res.arrayBuffer()
      } catch (e) {
        console.error(`[mw/cache.ts] Render error: ${url.pathname}`, e)
        // Hono は c.res を差し替えるときに元のレスポンスのヘッダを引き継ぐので、先にキャッシュ用のヘッダを落とす
        setNoStore(c.res.headers)
        c.res = await renderErrorResponse(c)
        return
      }
    }

    const cacheable =
      (c.req.method === 'GET' || c.req.method === 'HEAD') &&
      // 下書きプレビューは URL ごとに内容が変わり、保存操作でパージもされない
      !url.searchParams.has('draftKey') &&
      c.res.status < 500 &&
      c.res.headers.has('Cloudflare-CDN-Cache-Control')

    if (!cacheable) {
      setNoStore(c.res.headers)
    } else {
      // 取得に失敗した部品を含むページは、保持期間を短くして取り直させる（lib/degraded.ts）
      const degraded = getFetchState(c).locals.degraded
      if (degraded?.length) {
        console.warn(`[mw/cache.ts] Degraded page (short cache): ${url.pathname}`, JSON.stringify(degraded))
        shortenForDegraded(c.res.headers)
      }
    }
    if (body !== null) {
      c.res = new Response(body, c.res)
    }
  }
}

// 本文の描画中に例外が起きたときの応答。500 ページ（pages/500.astro）を描画し、それも失敗したら最小限の HTML を返す
async function renderErrorResponse(c: Context): Promise<Response> {
  try {
    const response = await getFetchState(c).rewrite('/500')
    const body = await response.arrayBuffer()
    return new Response(body, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  } catch (e) {
    console.error('[mw/cache.ts] Failed to render the 500 page', e)
  }
  const html =
    '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="robots" content="noindex">' +
    '<title>500 Internal Server Error | Maretol Base</title></head><body>' +
    '<h1>500 Internal Server Error</h1>' +
    '<p>ページの表示中にエラーが発生しました。時間をおいて再度アクセスしてください。</p>' +
    '<p><a href="/">Home</a></p></body></html>'
  return new Response(html, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
