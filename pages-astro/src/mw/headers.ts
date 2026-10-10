import type { MiddlewareHandler } from 'hono'

// セキュリティヘッダ（astro_design.md 5 章「セキュリティヘッダ」）。cf() を通過したすべてのレスポンスに付ける。
// 静的アセットは Worker の手前で配信され、cf() が ASSETS binding の応答をそのまま返す経路（manifest にはあるが実体の無い /_headers への 404 など）も
// ここを通らないので、同じ 2 つを public/_headers の /* でも付ける（値は両方で同じにそろえる）
// - X-Content-Type-Options: ブラウザに Content-Type を推測させない
// - Content-Security-Policy は frame-ancestors だけ。他サイトの iframe に埋め込まれないようにする。
//   自サイトのほかに、Clarity のヒートマップ（ダッシュボードが自サイトを iframe で開く）を許す。
//   script-src などは付けない（信頼境界が著者本人で、利用者の入力を HTML に出す箇所も無いため。許可リストの保守が割に合わない）
const FRAME_ANCESTORS = ["'self'", 'https://clarity.microsoft.com']

export function securityHeaders(): MiddlewareHandler {
  return async (c, next) => {
    await next()
    c.res.headers.set('X-Content-Type-Options', 'nosniff')
    c.res.headers.set('Content-Security-Policy', `frame-ancestors ${FRAME_ANCESTORS.join(' ')}`)
  }
}
