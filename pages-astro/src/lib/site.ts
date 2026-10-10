import { env } from 'cloudflare:workers'

export const SITE_NAME = 'Maretol Base'
export const SITE_DESCRIPTION = 'Maretolのホームページ'
export const TWITTER_ACCOUNT = '@maretol'

// 公開 URL のオリジン（末尾スラッシュなし）。共有 URL や OGP の url に使う
export function getHostname(): string {
  return env.HOST
}

// 本番かどうか。アクセス解析のタグ（beacon / Clarity）は本番だけに出す。
// 開発サーバーは wrangler.toml の既定の vars（本番の値）を読むので、ENV だけでは見分けられない
export function isProduction(): boolean {
  return !import.meta.env.DEV && env.ENV === 'PRD'
}

// 外部コンテンツ（YouTube / Google Maps / Tweet など）を src で読み込む iframe の sandbox 属性
// 注意: src が別オリジンの iframe 専用。srcDoc の iframe では使わないこと
export const outerContentIframeSandbox = 'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin'
