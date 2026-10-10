// Worker のエントリ（wrangler.toml の main）。閲覧者のリクエストもパージ要求もこの default entrypoint が受ける。
// Workers Cache のパージは呼び出した entrypoint のキャッシュにしか届かないので、パージ入口はここに置く（astro_design.md 4.4）
import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { middleware, pages, trailingSlash } from 'astro/hono'
import { cf } from '@astrojs/cloudflare/hono'
import type { PurgeResult, PurgeRPC } from 'cache-tags'
import { cacheHeaders } from './mw/cache'
import { securityHeaders } from './mw/headers'
import { accessLog } from './mw/log'
import { purgeByTags } from './mw/purge'
import { normalizeQuery } from './mw/query'

const app = new Hono<{ Bindings: Env }>()

// cf() は Astro の他のハンドラより前に置く（静的アセットの配信、locals.cfContext などの設定）
app.use(cf())
// セキュリティヘッダ。この後ろのミドルウェアが返すリダイレクトやエラーにも付ける
app.use(securityHeaders())
// 末尾のスラッシュの正規化（astro.config.ts の trailingSlash）。クエリの正規化より前に置き、スラッシュとクエリの両方がずれていても
// スラッシュを直した URL にクエリの正規化が 1 回かかるだけで済むようにする
app.use(trailingSlash())
// アクセスログ（Axiom）。レスポンスが確定してから記録するので、この後ろのミドルウェアが返す 308 や 500 もそのステータスで残る
app.use(accessLog())
// クエリの正規化は、ページの描画やキャッシュのヘッダの確定より前に行う
app.use(normalizeQuery())
app.use(cacheHeaders())
app.use(middleware())
app.use(pages())

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
