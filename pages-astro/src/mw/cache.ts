import type { MiddlewareHandler } from 'hono'
import { getFetchState } from 'astro/hono'
import { setNoStore, shortenForDegraded } from '../lib/cache'
import { renderErrorPage } from '../lib/error_page'
import { createEvent, describeError, recordLogEvent } from '../lib/log'

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
    const { locals } = getFetchState(c)
    const rendered = await readHTMLBody(c.res)
    if (!rendered.ok) {
      console.error(`[mw/cache.ts] Render error: ${url.pathname}`, rendered.error)
      recordLogEvent(locals, createEvent('render_error', { stage: 'stream', ...describeError(rendered.error) }))
      // Hono は c.res を差し替えるときに元のレスポンスのヘッダを引き継ぐので、先にキャッシュ用のヘッダを落とす
      setNoStore(c.res.headers)
      c.res = await renderErrorPage(c)
      return
    }

    // 取得に失敗した部品を含むページ（lib/degraded.ts）。キャッシュしないページでも記録は残す。
    // 記録が無い（undefined）のと、記録の配列が空なのは別のことなので、分けて判定する
    const degraded = locals.degraded
    const isDegraded = degraded !== undefined && degraded.length > 0
    if (isDegraded) {
      console.warn(`[mw/cache.ts] Degraded page: ${url.pathname}`, JSON.stringify(degraded))
      recordLogEvent(locals, createEvent('degraded_page', { reasons: degraded }))
    }

    const cacheable =
      (c.req.method === 'GET' || c.req.method === 'HEAD') &&
      // 下書きプレビューは URL ごとに内容が変わり、保存操作でパージもされない
      !url.searchParams.has('draftKey') &&
      c.res.status < 500 &&
      c.res.headers.has('Cloudflare-CDN-Cache-Control')

    if (!cacheable) {
      setNoStore(c.res.headers)
    } else if (isDegraded) {
      // 保持期間を短くして取り直させる
      shortenForDegraded(c.res.headers)
    }
    if (rendered.body !== null) {
      c.res = new Response(rendered.body, c.res)
    }
  }
}

// HTML の本文を最後まで読む。HTML 以外は読まずに null を返す。描画中の例外は本文を読む途中で投げられる
async function readHTMLBody(
  res: Response,
): Promise<{ ok: true; body: ArrayBuffer | null } | { ok: false; error: unknown }> {
  if (!res.body || !res.headers.get('Content-Type')?.includes('text/html')) {
    return { ok: true, body: null }
  }
  try {
    return { ok: true, body: await res.arrayBuffer() }
  } catch (error) {
    return { ok: false, error }
  }
}
