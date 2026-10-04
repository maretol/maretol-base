import type { MiddlewareHandler } from 'hono'

// クエリの正規化（astro_design.md 4.5）
// エッジのキャッシュのキーはパスとクエリ文字列なので、任意のクエリや並び順の違いで別のエントリになる。
// ルートごとに受け付けるクエリと並び順を決め、それ以外が付いていたら、正規化した URL へリダイレクトする。
// 値の検証（ページ番号の範囲、存在するタグかどうかなど）は各ページが行う

// ルートごとに受け付けるクエリ。並び順は、サイト内のリンクが作る順に合わせる（合わないと、リンクを踏むたびにリダイレクトになる）。
// ここに無いルートは、下の UTM 以外のクエリをすべて外す。ルートを足したら、ここにも足す
const routes: { pattern: RegExp; keys: string[] }[] = [
  { pattern: /^\/blog\/?$/, keys: ['p'] },
  { pattern: /^\/tag\/?$/, keys: ['tag_id', 'tag_name', 'p'] },
  { pattern: /^\/blog\/[^/]+\/?$/, keys: ['draftKey'] },
  { pattern: /^\/blog\/[^/]+\/image\/[^/]+\/?$/, keys: ['draftKey'] },
]

// 流入元を見るための UTM パラメータ。解析はブラウザ側（Clarity など）で URL から読むので、外さずに残す。
// 値は、共有ボタン（lib/utm.ts）と自動投稿（sns-article-publisher）が付けるものだけを通す。
// 任意の値を通すと、値を変えるだけでキャッシュのエントリを際限なく増やせてしまう
const utmValues: Record<string, string[]> = {
  utm_source: ['twitter', 'bluesky', 'clipboard', 'misskey', 'nostr'],
  utm_medium: ['social'],
  utm_campaign: ['share_button', 'auto_post'],
  utm_content: ['blog', 'illust', 'comics', 'comic', 'page'],
}

// 受け付けるクエリだけを、決まった順に並べたクエリ文字列（先頭の ? は付かない）。
// 同じキーが複数あるときは先頭の値を使い、空の値は外す
function normalize(pathname: string, params: URLSearchParams): string {
  const routeKeys = routes.find((route) => route.pattern.test(pathname))?.keys ?? []
  const entries = [...routeKeys, ...Object.keys(utmValues)].flatMap((key) => {
    const value = params.get(key)
    const accepted = value !== null && value !== '' && (utmValues[key]?.includes(value) ?? true)
    return accepted ? [[key, value]] : []
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

    const query = normalize(url.pathname, url.searchParams)
    // 「/blog?」のように ? だけが付いた URL も、付いていない URL へ揃える
    const hasEmptyQuery = url.search === '' && c.req.url.includes('?')
    if (query === url.search.slice(1) && !hasEmptyQuery) {
      return next()
    }

    // リダイレクト自体はキャッシュさせない（クエリの数だけエントリが増えるのを防ぐため）
    c.header('Cache-Control', 'private, no-store')
    return c.redirect(query ? `${url.pathname}?${query}` : url.pathname, 308)
  }
}
