import { env } from 'cloudflare:workers'

export const SITE_NAME = 'Maretol Base'
export const SITE_DESCRIPTION = 'Maretolのホームページ'
export const TWITTER_ACCOUNT = '@maretol'

// 公開 URL のオリジン（末尾スラッシュなし）。共有 URL や OGP の url に使う
export function getHostname(): string {
  return env.HOST
}

// 外部コンテンツ（YouTube / Google Maps / Tweet など）を src で読み込む iframe の sandbox 属性
// 注意: src が別オリジンの iframe 専用。srcDoc の iframe では使わないこと
export const outerContentIframeSandbox = 'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin'
