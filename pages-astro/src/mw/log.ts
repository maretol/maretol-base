import type { Context, MiddlewareHandler } from 'hono'
import { pageEvent, sendLogs } from '../lib/axiom'

// アクセスログ（astro_design.md 5 章「ログと解析」）。現行 pages/middleware.ts の移植。
// Workers Cache にヒットしたリクエストは Worker が起動しないので、ここに残るのは描画した（ミスした）リクエストだけ。
// アクセス解析は Cloudflare beacon / Clarity で行い、このログは異常なアクセスとエラーの監視に使う（決定 10）

const BOT_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: 'Googlebot', pattern: /googlebot/i },
  { name: 'Bingbot', pattern: /bingbot/i },
  { name: 'GPTBot', pattern: /gptbot/i },
  { name: 'ClaudeBot', pattern: /claudebot/i },
  { name: 'Applebot', pattern: /applebot/i },
  { name: 'Twitterbot', pattern: /twitterbot/i },
  { name: 'facebookexternalhit', pattern: /facebookexternalhit/i },
  { name: 'Slackbot', pattern: /slackbot/i },
  { name: 'Discordbot', pattern: /discordbot/i },
  { name: 'YandexBot', pattern: /yandex/i },
  { name: 'Baiduspider', pattern: /baiduspider/i },
  { name: 'DuckDuckBot', pattern: /duckduckbot/i },
  { name: 'Semrush', pattern: /semrush/i },
  { name: 'Ahrefs', pattern: /ahrefs/i },
  { name: 'MJ12bot', pattern: /mj12bot/i },
  { name: 'Bytespider', pattern: /bytespider/i },
]

function detectBot(userAgent: string): string | null {
  for (const { name, pattern } of BOT_PATTERNS) {
    if (pattern.test(userAgent)) {
      return name
    }
  }
  // 一般的な bot の判定
  if (/bot|crawler|spider|scraper/i.test(userAgent)) {
    return 'UnknownBot'
  }
  return null
}

// 残さないパス。静的アセットは Worker の手前で配信されるのでここには来ないが、拡張子での除外は現行と同じにしておく
const EXCLUDED_PATHS = ['/favicon.ico', '/icon.ico', '/.well-known/nostr.json', '/sitemap.xml', '/rss/feed.rdf']
const EXCLUDED_EXTENSIONS = ['.svg', '.ico', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp', '.css', '.js']

function isExcluded(url: URL, headers: Headers): boolean {
  const pathname = url.pathname.toLowerCase()
  // Astro の内部ルート（/_server-islands/ など）と Cloudflare の経路は、ページの表示に付随するものなので残さない
  if (pathname.startsWith('/_') || pathname.startsWith('/cdn-cgi/')) {
    return true
  }
  if (EXCLUDED_PATHS.includes(pathname) || EXCLUDED_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return true
  }
  // ブラウザの先読み
  const purpose = headers.get('sec-purpose') ?? headers.get('purpose')
  return purpose !== null && purpose.includes('prefetch')
}

type Geo = { country?: string; region?: string; city?: string }

// 受信したリクエストの cf かどうか。fetch() の引数に付ける cf と同じ型（CfProperties）になっているので区別する。
// 受信したリクエストの cf には必ず colo が入る
function isIncomingRequestCf(cf: CfProperties): cf is IncomingRequestCfProperties {
  return typeof cf.colo === 'string'
}

// 地域情報は request.cf から読む（現行は OpenNext が詰め直した x-open-next-* ヘッダから読んでいた）。
// region は現行と同じく regionCode（東京都なら "13"）
function getGeo(request: Request): Geo {
  const cf = request.cf
  if (cf === undefined || !isIncomingRequestCf(cf)) {
    return {}
  }
  return { country: cf.country, region: cf.regionCode, city: cf.city }
}

// 現行のログと同じ項目に status を足したもの。項目名は Axiom のダッシュボードと合わせているので変えない
function createAccessLog(c: Context, url: URL) {
  const headers = c.req.raw.headers
  const userAgent = headers.get('user-agent') || 'unknown'
  const botName = detectBot(userAgent)
  const geo = getGeo(c.req.raw)
  return pageEvent('access_log', url, {
    method: c.req.method,
    status: c.res.status,

    // 流入経路
    referer: headers.get('referer') || 'unknown',
    utm_source: url.searchParams.get('utm_source'),
    utm_medium: url.searchParams.get('utm_medium'),
    utm_campaign: url.searchParams.get('utm_campaign'),

    // bot
    is_bot: botName !== null,
    bot_name: botName,

    // デバイス・地域
    user_agent: userAgent,
    country: geo.country,
    region: geo.region,
    city: geo.city,
    connecting_ip: headers.get('cf-connecting-ip'),
  })
}

// レスポンスが確定してから記録する。500 への差し替えやクエリの正規化の 308 も、そのステータスで残る
export function accessLog(): MiddlewareHandler {
  return async (c, next) => {
    const url = new URL(c.req.url)
    if (isExcluded(url, c.req.raw.headers)) {
      return next()
    }
    await next()
    sendLogs(c.executionCtx, [createAccessLog(c, url)])
  }
}
