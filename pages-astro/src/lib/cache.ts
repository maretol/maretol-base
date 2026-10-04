import { cacheTag } from 'cache-tags'

// エッジで保持する秒数。更新は保存時のタグパージで反映するので、長さはパージ漏れ時の上限としてしか効かない
const EDGE_TTL = 30 * 24 * 60 * 60
// 404 を保持する秒数。存在しない URL への連続アクセスで毎回 D1 まで届くのを防ぐ
const NOT_FOUND_TTL = 60
// 取得に失敗した部品を含むページを保持する秒数。一時的な失敗による不完全な表示が 30 日残らないようにする
const DEGRADED_TTL = 10 * 60
// リンクカード（Server Island）を保持する秒数。リンク先の更新を知る手段が無いので、OGP データを KV に持つ期間（lib/api/ogp.ts）と同じにする
const LINK_CARD_TTL = 3 * 24 * 60 * 60
// リンク先の情報を取得できなかったリンクカードを保持する秒数。時間をおいて取り直す
const LINK_CARD_FAILURE_TTL = 10 * 60

type ResponseLike = { readonly headers: Headers }

// ページをエッジにキャッシュさせる。ページの frontmatter で呼ぶ（レイアウトやコンポーネントの中からはヘッダを変えられない）。
// エッジは Cloudflare-CDN-Cache-Control を優先するので、ブラウザには保持させずエッジだけ長く持たせられる
export function cachePage(response: ResponseLike, tags: string[], ttl: number = EDGE_TTL): void {
  response.headers.set('Cloudflare-CDN-Cache-Control', `max-age=${ttl}`)
  response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
  response.headers.set('Cache-Tag', [...new Set([cacheTag.layout, ...tags])].join(','))
}

export function cacheNotFound(response: ResponseLike, tags: string[]): void {
  cachePage(response, tags, NOT_FOUND_TTL)
}

// リンクカード（Server Island）のレスポンスをエッジにキャッシュさせる。記事とは別のリクエストなので、保持期間も記事とは別に決める
export function cacheLinkCard(response: ResponseLike, fetched: boolean): void {
  cachePage(response, [], fetched ? LINK_CARD_TTL : LINK_CARD_FAILURE_TTL)
}

// 取得に失敗した部品を含むページの保持期間を短くする。もともと短いもの（404 など）は延ばさない
export function shortenForDegraded(headers: Headers): void {
  const current = Number(headers.get('Cloudflare-CDN-Cache-Control')?.match(/max-age=(\d+)/)?.[1])
  if (Number.isFinite(current) && current > DEGRADED_TTL) {
    headers.set('Cloudflare-CDN-Cache-Control', `max-age=${DEGRADED_TTL}`)
  }
}

export function noStore(response: ResponseLike): void {
  setNoStore(response.headers)
}

export function setNoStore(headers: Headers): void {
  headers.delete('Cloudflare-CDN-Cache-Control')
  headers.delete('Cache-Tag')
  headers.set('Cache-Control', 'private, no-store')
}
