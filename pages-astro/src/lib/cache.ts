import { cacheTag } from 'cache-tags'
import type { CiteImageResult } from '@/lib/api/cite_image'

// エッジで保持する秒数。更新は保存時のタグパージで反映するので、長さはパージ漏れ時の上限としてしか効かない
const EDGE_TTL = 30 * 24 * 60 * 60
// 404 と 400 を保持する秒数。存在しない URL や受け付けない値への連続アクセスで、毎回 D1 まで届くのを防ぐ
const CLIENT_ERROR_TTL = 60
// 取得に失敗した部品を含むページを保持する秒数。一時的な失敗による不完全な表示が 30 日残らないようにする
const DEGRADED_TTL = 10 * 60
// リンクカード（Server Island）を保持する秒数。リンク先の更新を知る手段が無いので、OGP データを KV に持つ期間（lib/api/ogp.ts）と同じにする
const LINK_CARD_TTL = 3 * 24 * 60 * 60
// リンク先の情報を取得できなかったリンクカードを保持する秒数。時間をおいて取り直す
const LINK_CARD_FAILURE_TTL = 10 * 60
// 引用画像（Server Island）を保持する秒数。取得した画像を KV に持つ期間（lib/api/cite_image.ts）と同じにする
const CITE_IMAGE_TTL = 7 * 24 * 60 * 60
// 一時的に取得できなかった引用画像を保持する秒数。時間をおいて取り直す
const CITE_IMAGE_FAILURE_TTL = 10 * 60

// 最新の記事・漫画・イラストの一覧と、タグの一覧を出すページのタグ。サイドバーとトップページが該当する
export const latestListTags = [cacheTag.blog, cacheTag.blogList, cacheTag.comicList, cacheTag.illustList]

type ResponseLike = { readonly headers: Headers }

type CacheOptions = {
  // エッジで保持する秒数
  ttl?: number
  // サイドバー（layouts/BlogLayout.astro）を出すページは true。サイドバーが表示する一覧のタグを足す
  sidebar?: boolean
}

// ページをエッジにキャッシュさせる。ページの frontmatter で呼ぶ（レイアウトやコンポーネントの中からはヘッダを変えられない）。
// エッジは Cloudflare-CDN-Cache-Control を優先するので、ブラウザには保持させずエッジだけ長く持たせられる
export function cachePage(
  response: ResponseLike,
  tags: string[],
  { ttl = EDGE_TTL, sidebar = false }: CacheOptions = {},
): void {
  const allTags = [cacheTag.layout, ...(sidebar ? latestListTags : []), ...tags]
  response.headers.set('Cloudflare-CDN-Cache-Control', `max-age=${ttl}`)
  response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
  response.headers.set('Cache-Tag', [...new Set(allTags)].join(','))
}

// サイドバーを出すページが、サイドバーの一覧のタグを付けているかを確かめる。サイドバーの描画時に呼ぶ。
// 付け忘れると、記事・漫画・イラストを保存しても古いサイドバーが残るので、例外にして気づけるようにする
export function assertSidebarTagged(response: ResponseLike): void {
  // キャッシュしないページ（下書きプレビューなど）は対象外
  if (!response.headers.has('Cloudflare-CDN-Cache-Control')) {
    return
  }
  const tags = new Set(response.headers.get('Cache-Tag')?.split(','))
  if (!latestListTags.every((tag) => tags.has(tag))) {
    throw new Error('サイドバーを出すページは、cachePage() に { sidebar: true } を渡す')
  }
}

export function cacheNotFound(response: ResponseLike, tags: string[]): void {
  cachePage(response, tags, { ttl: CLIENT_ERROR_TTL })
}

export function cacheBadRequest(response: ResponseLike, tags: string[]): void {
  cachePage(response, tags, { ttl: CLIENT_ERROR_TTL })
}

// リンクカード（Server Island）のレスポンスをエッジにキャッシュさせる。記事とは別のリクエストなので、保持期間も記事とは別に決める
export function cacheLinkCard(response: ResponseLike, fetched: boolean): void {
  cachePage(response, [], { ttl: fetched ? LINK_CARD_TTL : LINK_CARD_FAILURE_TTL })
}

// 引用画像（Server Island）のレスポンスをエッジにキャッシュさせる。記事とは別のリクエストなので、保持期間も記事とは別に決める。
// 取り直しても直らない失敗（引用元の 4xx、未対応の形式、大きすぎる画像）は、代わりの表示を成功と同じ長さで保持する
export function cacheCiteImage(response: ResponseLike, image: CiteImageResult): void {
  const transient = !image.ok && !image.permanent
  cachePage(response, [], { ttl: transient ? CITE_IMAGE_FAILURE_TTL : CITE_IMAGE_TTL })
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
