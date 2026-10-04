/// <reference path="../../cms-data-fetcher/types.d.ts" />
/// <reference path="../../ogp-data-fetcher/types.d.ts" />

// wrangler types（worker-configuration.d.ts）は Service Binding を Fetcher としか出力しないので、
// RPC メソッドの型をここで付ける（pages / admin-pages の env.d.ts と同じやり方）。
// `import { env } from 'cloudflare:workers'` は Cloudflare.Env、WorkerEntrypoint<Env> や Hono の Bindings はグローバルの Env を見る
declare namespace Cloudflare {
  interface Env {
    CMS_RPC: Service<CMSDataFetcher>
    OGP_RPC: Service<OGPDataFetcher>
  }
}

interface Env {
  CMS_RPC: Service<CMSDataFetcher>
  OGP_RPC: Service<OGPDataFetcher>
}

declare namespace App {
  interface Locals {
    // 404 ページへ rewrite するときに、元のページから渡すキャッシュの扱い
    notFound?: {
      // 付与する Cache-Tag。記事が公開されたときに 404 のキャッシュも一緒に消すために使う
      tags?: string[]
      noStore?: boolean
    }
    // 描画中にデータ取得に失敗した部品の記録（src/lib/degraded.ts）。1 件でもあるとページを長くキャッシュしない
    degraded?: string[]
  }
}
