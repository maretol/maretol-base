import { NextRequest, NextResponse } from 'next/server'

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
  url: URL,
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
    path: url.pathname,
    search: url.search,

    // 流入経路
    referer: referer,
    utm_source: url.searchParams.get('utm_source'),
    utm_medium: url.searchParams.get('utm_medium'),
    utm_campaign: url.searchParams.get('utm_campaign'),

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

export function middleware(request: NextRequest) {
  const method = request.method
  const url = new URL(request.url)
  const userAgent = request.headers.get('user-agent') || 'non-user-agent'
  const referer = request.headers.get('referer') || 'non-referer'
  const botName = detectBot(userAgent)
  const cf: CfProperties | undefined = request.cf
  const ip = request.headers.get('cf-connecting-ip')

  const logObj = createLogObject(url, userAgent, referer, method, botName, ip, cf)
  console.log(logObj)

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|cdn-cgi|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)'],
}
