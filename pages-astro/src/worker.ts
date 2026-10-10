// Worker のエントリ（wrangler.toml の main）。閲覧者のリクエストもパージ要求もこの default entrypoint が受ける。
// Workers Cache のパージは呼び出した entrypoint のキャッシュにしか届かないので、パージ入口はここに置く（astro_design.md 4.4）
import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { getFetchState, middleware, pages, trailingSlash } from 'astro/hono'
import { cf } from '@astrojs/cloudflare/hono'
import type { PurgeResult, PurgeRPC } from 'cache-tags'
import { renderErrorPage } from './lib/error_page'
import { createEvent, describeError, recordLogEvent } from './lib/log'
import { cacheHeaders } from './mw/cache'
import { securityHeaders } from './mw/headers'
import { observe } from './mw/observe'
import { purgeByTags } from './mw/purge'
import { normalizeQuery } from './mw/query'

const app = new Hono<{ Bindings: Env }>()

// cf() は Astro の他のハンドラより前に置く（静的アセットの配信、locals.cfContext などの設定）
app.use(cf())
// セキュリティヘッダ。この後ろのミドルウェアが返すリダイレクトやエラーにも付ける
app.use(securityHeaders())
// 観測（Axiom へのアクセスログとイベントの送信）。レスポンスが確定してから送るので、この後ろが返す 301 / 308 / 500 もそのステータスで残る
app.use(observe())
// 末尾のスラッシュの正規化（astro.config.ts の trailingSlash）。クエリの正規化より前に置き、スラッシュとクエリの両方がずれていても
// スラッシュを直した URL にクエリの正規化が 1 回かかるだけで済むようにする
app.use(trailingSlash())
// クエリの正規化は、ページの描画やキャッシュのヘッダの確定より前に行う
app.use(normalizeQuery())
app.use(cacheHeaders())
app.use(middleware())
app.use(pages())
// ミドルウェアの例外（mw/query.ts の routes に無いルートなど）。記録して 500 ページを返す。
// ページの描画中の例外はここに来ない（frontmatter の例外は Astro が 500 ページを描き、本文の描画中の例外は mw/cache.ts が扱う）
app.onError((error, c) => {
  console.error(`[worker.ts] Middleware error: ${new URL(c.req.url).pathname}`, error)
  recordLogEvent(getFetchState(c).locals, createEvent('middleware_error', describeError(error)))
  return renderErrorPage(c)
})

export default class extends WorkerEntrypoint<Env> implements PurgeRPC {
  fetch(request: Request): Response | Promise<Response> {
    return app.fetch(request, this.env, this.ctx)
  }

  // admin-pages が保存時に Service Binding 経由で呼ぶ。
  // RPC メソッドは Service Binding を持つ Worker からしか呼べないので、公開側から到達する経路はない
  purgeTags(tags: string[]): Promise<PurgeResult> {
    return purgeByTags(this.ctx, tags)
  }
}
