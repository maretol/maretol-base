// E2E テスト全体で共有する定数・ヘルパ。
// マーカーや対象ルートを単一箇所で管理し、テストと readiness の間で drift を防ぐ。

// 主要ルート共通シェル（BaseLayout / BlogLayout の双方）が描画するヘッダーロゴの alt。
// readiness マーカーおよびスモークのランドマークとして利用する。
export const SITE_LOGO_ALT = 'Maretol Base'

// スモークテストで巡回する既存の主要ルート。
export const MAIN_ROUTES = ['/', '/blog', '/illust', '/comics', '/about', '/contact', '/tag'] as const

// 404 検証用の、存在しないことが期待されるパス。
export const NOT_FOUND_PATH = '/__e2e_nonexistent_path__'

// フィード（RSS / sitemap）の検証対象パスと、本文に含まれるべきルート要素。
export const RSS_FEED_PATH = '/rss/feed.rdf'
export const RSS_ROOT_ELEMENT = '<rss'
export const SITEMAP_PATH = '/sitemap.xml'
export const SITEMAP_ROOT_ELEMENT = '<urlset'

// base URL を環境変数から取得する。未設定なら明示的なエラーで停止（fail-fast）。
export function requireBaseURL(): string {
  const baseURL = process.env.E2E_BASE_URL
  if (!baseURL) {
    throw new Error('E2E_BASE_URL is not set')
  }
  return baseURL
}
