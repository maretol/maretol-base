import type { Context, MiddlewareHandler } from 'hono'
import { getFetchState } from 'astro/hono'
import { isPageParam } from '../lib/pagination'

// クエリの正規化（astro_design.md 4.5）
// エッジのキャッシュのキーはパスとクエリ文字列なので、任意のクエリや並び順の違いで別のエントリになる。
// ルートごとに受け付けるクエリと並び順を決め、それ以外が付いていたら、正規化した URL へリダイレクトする。
// 値まで見るのはページ番号の形式だけ。ページ番号の範囲や、存在するタグかどうかは各ページが判定する

// ルートごとに受け付けるクエリ。キーは Astro のルートで、src/pages のファイルと 1 対 1 に対応する
// （src/pages/blog/[article_id].astro なら /blog/[article_id]）。
// 並び順は、サイト内のリンクが作る順に合わせる（合わないと、リンクを踏むたびにリダイレクトになる）。
// クエリを受け付けないルートも空の配列で載せる。載せていないルートへのリクエストは例外になる（getRouteKeys）
const routes: Partial<Record<string, string[]>> = {
  '/': [],
  '/blog': ['p'],
  '/blog/[article_id]': ['draftKey'],
  '/blog/[article_id]/image/[src]': ['draftKey'],
  // 解錠は POST で、POST はここを通らない。GET で開かれたときは 404 になる
  '/blog/[article_id]/unlock': [],
  '/tag': ['tag_id', 'tag_name', 'p'],
  '/about': [],
  '/contact': [],
  '/secret': [],
  '/artifacts/post-for-nostter': [],
  '/rss/feed.rdf': [],
  '/sitemap.xml': [],
  '/400': [],
  '/404': [],
  '/500': [],
}

// 流入元を見るための UTM パラメータ。解析はブラウザ側（Clarity など）で URL から読むので、どのルートでも外さずに残す。
// 値は見ない。値を変えればキャッシュのエントリを増やせるが、存在しないパスなどでも同じことができるので、ここでは絞らない。
// 増えたときは Worker の起動回数に表れる（ヒット時は Worker が起動しない）
const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']

// リクエストのルートが受け付けるクエリ。
// ルートの判定は Astro に任せる（パスのデコードや末尾のスラッシュの扱いを、ページの描画と揃えるため）。
// どのルートにも一致しないパスには、Astro が 404 のルートを割り当てる
function getRouteKeys(c: Context): string[] {
  const route = getFetchState(c).routeData?.route
  if (route === undefined) {
    return []
  }
  const keys = routes[route]
  if (!keys) {
    // 黙ってクエリを外すと、ページ番号や draftKey が効かない原因に気づけないので、例外にする
    throw new Error(`mw/query.ts の routes に ${route} が無い。ルートを足したら、受け付けるクエリをここにも足す`)
  }
  return keys
}

// 受け付ける値かどうか。空の値は外す。
// ページ番号は形式まで見て、不正な値と p=1 を外す（1 ページ目は p の無い URL に統一する）
function accepts(key: string, value: string): boolean {
  return value !== '' && (key !== 'p' || isPageParam(value))
}

// 受け付けるクエリだけを、決まった順に並べたクエリ文字列（先頭の ? は付かない）。
// 同じキーが複数あるときは先頭の値を使う
function normalize(routeKeys: string[], params: URLSearchParams): string {
  const entries = [...routeKeys, ...utmKeys].flatMap((key) => {
    const value = params.get(key)
    return value !== null && accepts(key, value) ? [[key, value]] : []
  })
  return new URLSearchParams(entries).toString()
}

export function normalizeQuery(): MiddlewareHandler {
  return async (c, next) => {
    const url = new URL(c.req.url)
    // 対象は表示のためのリクエストだけ。Astro の内部ルート（/_server-islands/ など）は、クエリの形が決まっているので触らない
    if ((c.req.method !== 'GET' && c.req.method !== 'HEAD') || url.pathname.startsWith('/_')) {
      return next()
    }

    const query = normalize(getRouteKeys(c), url.searchParams)
    // 「/blog?」のように ? だけが付いた URL も、付いていない URL へ揃える
    const hasEmptyQuery = url.search === '' && c.req.url.includes('?')
    if (query === url.search.slice(1) && !hasEmptyQuery) {
      return next()
    }

    // リダイレクト先は、スラッシュ 1 つで始まるパスにする。
    // 「//example.com」のようなパスをそのまま返すと、ブラウザがホスト名として解釈し、別サイトへのリダイレクトになる
    const pathname = url.pathname.replace(/^\/+/, '/')
    // リダイレクト自体はキャッシュさせない（クエリの数だけエントリが増えるのを防ぐため）
    c.header('Cache-Control', 'private, no-store')
    return c.redirect(query ? `${pathname}?${query}` : pathname, 308)
  }
}
