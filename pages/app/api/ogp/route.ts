import { getLocalEnv } from '@/lib/env'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { OGPResult } from 'api-types'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (getLocalEnv() === 'local') {
    return await fetchLocal(request)
  }

  const { env } = getRequestContext()

  const response = await env.OGP_FETCHER.fetch(request.clone())

  if (response.status !== 200) {
    console.log('error: ', await response.text())
    const errorResponse = {
      success: false,
    } as OGPResult
    return Response.json(errorResponse)
  }

  return Response.json(await response.json())
}

async function fetchLocal(request: Request) {
  const url = new URL(request.url)
  const path = url.pathname
  const query = url.search
  const localUrl = 'http://localhost:45678/api/' + path + query
  const response = await fetch(localUrl, { headers: request.headers, method: request.method })
  return Response.json(await response.json())
}
