import { getLocalEnv } from '@/lib/env'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { OGPResult } from 'api-types'
import { NextRequest } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (getLocalEnv() === 'local') {
    return await fetchLocal(request)
  }
  const { env } = getRequestContext()

  const response = await env.OGP_FETCHER.fetch(request)

  if (response.status !== 200) {
    console.log('error: ', await response.text())
    const errorResponse = {
      success: false,
    } as OGPResult
    return Response.json(errorResponse)
  }

  return Response.json(await response.json())
}

// ローカル実行時用
async function fetchLocal(request: NextRequest) {
  const ogp = await import('ogp-data-fetcher')

  const { env, ctx } = getRequestContext()
  const API_KEY = env.OGP_FETCHER_API_KEY

  const response = await ogp.fetchOGPLocal.default.fetch(request, { API_KEY }, ctx)
  return Response.json(await response.json())
}
