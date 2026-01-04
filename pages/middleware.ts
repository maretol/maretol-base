import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextRequest, NextResponse } from 'next/server'
import sendLog from './lib/logger'

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

function createLogObject(
  host: string,
  pathname: string,
  searchParams: URLSearchParams,
  userAgent: string,
  referer: string,
  method: string,
  botName: string | null,
  ip: string | null,
  cf?: CfProperties
) {
  return {
    type: 'access_log',
    // アクセス情報
    timestamp: new Date().toISOString(),
    method: method,
    host: host,
    path: pathname,
    search: searchParams.toString(),

    // 流入経路
    referer: referer,
    utm_source: searchParams.get('utm_source'),
    utm_medium: searchParams.get('utm_medium'),
    utm_campaign: searchParams.get('utm_campaign'),

    // bot情報
    is_bot: botName !== null,
    bot_name: botName,

    // デバイス・地域情報
    user_agent: userAgent,
    country: cf?.country,
    region: cf?.region,
    city: cf?.city,
    connecting_ip: ip,
  }
}

function hasImageExtension(pathname: string): boolean {
  pathname = pathname.toLowerCase()
  const imageExtList = ['.svg', '.ico', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp']
  return imageExtList.some((ext) => pathname.endsWith(ext))
}

export async function middleware(request: NextRequest) {
  const method = request.method
  const { host, pathname, searchParams } = request.nextUrl

  if (hasImageExtension(pathname)) {
    return NextResponse.next()
  }

  const userAgent = request.headers.get('user-agent') || 'unknown'
  const referer = request.headers.get('referer') || 'unknown'
  const botName = detectBot(userAgent)
  const cf: CfProperties | undefined = request.cf
  const ip = request.headers.get('cf-connecting-ip')

  const logObj = createLogObject(host, pathname, searchParams, userAgent, referer, method, botName, ip, cf)
  console.log(logObj)

  try {
    const { env, ctx } = await getCloudflareContext({ async: true })
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
      source: '/((?!_next/static|_next/image|cdn-cgi|favicon.ico|icon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
