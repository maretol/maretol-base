import type { Context } from 'hono'
import { getFetchState } from 'astro/hono'
import { setNoStore } from './cache'

// 本文の描画中の例外（src/mw/cache.ts）やミドルウェアの例外（src/worker.ts の onError）のときの応答。
// 500 ページ（pages/500.astro）を描画し、それも失敗したら最小限の HTML を返す。キャッシュはさせない
export async function renderErrorPage(c: Context): Promise<Response> {
  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8' })
  setNoStore(headers)
  try {
    const response = await getFetchState(c).rewrite('/500')
    return new Response(await response.arrayBuffer(), { status: 500, headers })
  } catch (e) {
    console.error('[lib/error_page.ts] Failed to render the 500 page', e)
  }
  const html =
    '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="robots" content="noindex">' +
    '<title>500 Internal Server Error | Maretol Base</title></head><body>' +
    '<h1>500 Internal Server Error</h1>' +
    '<p>ページの表示中にエラーが発生しました。時間をおいて再度アクセスしてください。</p>' +
    '<p><a href="/">Home</a></p></body></html>'
  return new Response(html, { status: 500, headers })
}
