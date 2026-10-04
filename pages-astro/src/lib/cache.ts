import { cacheTag } from 'cache-tags'

// エッジで保持する秒数。更新は保存時のタグパージで反映するので、長さはパージ漏れ時の上限としてしか効かない
const EDGE_TTL = 30 * 24 * 60 * 60
// 404 を保持する秒数。存在しない URL への連続アクセスで毎回 D1 まで届くのを防ぐ
const NOT_FOUND_TTL = 60

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

export function noStore(response: ResponseLike): void {
  setNoStore(response.headers)
}

export function setNoStore(headers: Headers): void {
  headers.delete('Cloudflare-CDN-Cache-Control')
  headers.delete('Cache-Tag')
  headers.set('Cache-Control', 'private, no-store')
}
