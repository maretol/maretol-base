import { getCloudflareContext } from '@opennextjs/cloudflare'
import { OGPResult } from 'api-types'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const ua = request.headers.get('user-agent') || ''
  if (ua === 'Next.js Middleware') {
    return new Response('Next.js Middlewareからのリクエストは処理しません', { status: 400 })
  }

  const { env } = await getCloudflareContext({ async: true })
  const apiKey = env.OGP_FETCHER_API_KEY
  const headerApiKey = request.headers.get('x-api-key')
  if (apiKey !== headerApiKey) {
    return new Response('Invalid API Key', { status: 401 })
  }

  const response = await env.OGP_RPC.fetch(request)

  if (response.status !== 200) {
    console.error('[app/api/ogp/route.ts:13] OGP RPC error:', await response.text())
    const errorResponse = {
      success: false,
    } as OGPResult
    return Response.json(errorResponse)
  }

  return Response.json(await response.json())
}
