import type { Context, MiddlewareHandler } from 'hono'
import { getFetchState } from 'astro/hono'
import { sendLogs } from '../lib/axiom'
import { createEvent, type LogEvent } from '../lib/log'

// 1 リクエストの観測（astro_design.md 5 章「ログと解析」）
// - cf() の直後に置く。レスポンスが確定してから、アクセスログと、後ろのミドルウェアやページが記録したイベント（Astro.locals.logEvents）を
//   まとめて 1 回で Axiom に送る。後ろで例外が起きても（Hono の onError が 500 ページにする）送る
// - 末尾のスラッシュの 301 やクエリの正規化の 308、500 への差し替えも、そのステータスで残る
// - Workers Cache にヒットしたリクエストは Worker が起動しないので、残るのは描画した（ミスした）リクエストだけ。
//   アクセス解析は Cloudflare beacon / Clarity で行い、このログは異常なアクセスとエラーの監視に使う（決定 10）

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

// アクセスログに残さないもの。
// - Astro の内部ルート（Server Island、ビルド成果物、画像サービス）と Cloudflare の経路。ページの表示に付随するもの
// - 機械向けのルート（RSS、sitemap）
// - ブラウザの先読み
// 静的アセット（favicon や robots.txt など）は Worker の手前で配信されるので、その形のパスがここに来るのは存在しないものへのアクセス。それは残す
const EXCLUDED_PREFIXES = ['/_server-islands/', '/_astro/', '/_image', '/cdn-cgi/']
const EXCLUDED_PATHS = ['/sitemap.xml', '/rss/feed.rdf']

function isAccessLogExcluded(url: URL, headers: Headers): boolean {
  const pathname = url.pathname.toLowerCase()
  if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || EXCLUDED_PATHS.includes(pathname)) {
    return true
  }
  const purpose = headers.get('sec-purpose') ?? headers.get('purpose')
  return purpose !== null && purpose.includes('prefetch')
}

type Geo = { country?: string; region?: string; city?: string }

// 受信したリクエストの cf かどうか。fetch() の引数に付ける cf と同じ型（CfProperties）になっているので区別する。
// 受信したリクエストの cf には必ず colo が入る
function isIncomingRequestCf(cf: CfProperties): cf is IncomingRequestCfProperties {
  return typeof cf.colo === 'string'
}

// 地域情報は request.cf から読む。region は現行と同じく regionCode（東京都なら "13"）
function getGeo(request: Request): Geo {
  const cf = request.cf
  if (cf === undefined || !isIncomingRequestCf(cf)) {
    return {}
  }
  return { country: cf.country, region: cf.regionCode, city: cf.city }
}

// 現行 pages/middleware.ts のログと同じ項目に、status と route（Astro のルート。/blog/[article_id] の形）を足したもの。
// 項目名は Axiom のダッシュボードと合わせているので変えない
function accessLogEvent(c: Context, url: URL, route: string | null): LogEvent {
  const headers = c.req.raw.headers
  const userAgent = headers.get('user-agent') || 'unknown'
  const botName = detectBot(userAgent)
  const geo = getGeo(c.req.raw)
  return createEvent('access_log', {
    method: c.req.method,
    host: url.host,
    path: url.pathname,
    search: url.search,
    route,
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

export function observe(): MiddlewareHandler {
  return async (c, next) => {
    // ルートは描画の前に取る。500 ページへの rewrite のあとは routeData が /500 に変わっているため
    const route = getFetchState(c).routeData?.route ?? null
    try {
      await next()
    } finally {
      const url = new URL(c.req.url)
      const events = isAccessLogExcluded(url, c.req.raw.headers) ? [] : [accessLogEvent(c, url, route)]
      events.push(...(getFetchState(c).locals.logEvents ?? []))
      if (events.length > 0) {
        sendLogs(c.executionCtx, events)
      }
    }
  }
}
