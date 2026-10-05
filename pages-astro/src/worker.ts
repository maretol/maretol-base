// Worker のエントリ（wrangler.toml の main）。閲覧者のリクエストもパージ要求もこの default entrypoint が受ける。
// Workers Cache のパージは呼び出した entrypoint のキャッシュにしか届かないので、パージ入口はここに置く（astro_design.md 4.4）
import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { middleware, pages } from 'astro/hono'
import { cf } from '@astrojs/cloudflare/hono'
import type { PurgeResult, PurgeRPC } from 'cache-tags'
import { cacheHeaders } from './mw/cache'
import { purgeByTags } from './mw/purge'
import { normalizeQuery } from './mw/query'

const app = new Hono<{ Bindings: Env }>()

// cf() は Astro の他のハンドラより前に置く（静的アセットの配信、locals.cfContext などの設定）
app.use(cf())
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
