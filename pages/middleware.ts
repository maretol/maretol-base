import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextRequest, NextResponse } from 'next/server'
import sendLog from './lib/logger'
import { NextURL } from 'next/dist/server/web/next-url'
import { getNodeEnv } from './lib/env'

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
  // 一般的なbot判定
  if (/bot|crawler|spider|scraper/i.test(userAgent)) {
    return 'UnknownBot'
  }
  return null
}

type GeoInfo = {
  country: string | undefined
  region: string | undefined
  city: string | undefined
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

// OpenNext (cloudflare-edge wrapper) は request.cf の地域情報を x-open-next-* ヘッダに詰めて middleware に渡す。
// NextRequest には request.cf が引き継がれず常に undefined になるため、ヘッダから取得する。
// - x-open-next-region には cf.regionCode (例: 東京都なら "13") が入る
// - x-open-next-city は percent-encoding されている
function getGeoFromHeaders(headers: Headers): GeoInfo {
  const city = headers.get('x-open-next-city')
  return {
    country: headers.get('x-open-next-country') ?? undefined,
    region: headers.get('x-open-next-region') ?? undefined,
    city: city !== null ? safeDecodeURIComponent(city) : undefined,
  }
}

function createLogObject(
  nextURL: NextURL,
  userAgent: string,
  referer: string,
  method: string,
  botName: string | null,
  ip: string | null,
  geo: GeoInfo,
) {
  return {
    type: 'access_log',
    // アクセス情報
    timestamp: new Date().toISOString(),
    method: method,
    host: nextURL.host,
    path: nextURL.pathname,
    search: nextURL.search,

    // 流入経路
    referer: referer,
    utm_source: nextURL.searchParams.get('utm_source'),
    utm_medium: nextURL.searchParams.get('utm_medium'),
    utm_campaign: nextURL.searchParams.get('utm_campaign'),

    // bot情報
    is_bot: botName !== null,
    bot_name: botName,

    // デバイス・地域情報
    user_agent: userAgent,
    country: geo.country,
    region: geo.region,
    city: geo.city,
    connecting_ip: ip,
  }
}

function hasExcludeExtension(pathname: string): boolean {
  pathname = pathname.toLowerCase()
  const imageExtList = ['.svg', '.ico', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp', '.css', '.js']
  return imageExtList.some((ext) => pathname.endsWith(ext))
}

export async function middleware(request: NextRequest) {
  const method = request.method
  const nextURL = request.nextUrl

  if (hasExcludeExtension(nextURL.pathname)) {
    return NextResponse.next()
  }

  const userAgent = request.headers.get('user-agent') || 'unknown'
  const referer = request.headers.get('referer') || 'unknown'
  const botName = detectBot(userAgent)
  const ip = request.headers.get('cf-connecting-ip')
  const geo = getGeoFromHeaders(request.headers)

  const logObj = createLogObject(nextURL, userAgent, referer, method, botName, ip, geo)
  console.log(logObj)

  try {
    const { env, ctx } = await getCloudflareContext({ async: true })
    if (getNodeEnv() !== 'production') {
      console.log('Axiom skipped in non-production environment')
      return NextResponse.next()
    }
    const endpoint = await env.AXIOM_ENDPOINT.get()
    const apiToken = await env.AXIOM_APITOKEN.get()
    ctx.waitUntil(sendLog(logObj, endpoint, apiToken))
  } catch (e) {
    console.log('Axiom send log error: ', e)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    {
      source:
        '/((?!_next/static|_next/image|cdn-cgi|favicon.ico|icon.ico|.well-known/nostr.json|sitemap.xml|rss/feed.rdf).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
