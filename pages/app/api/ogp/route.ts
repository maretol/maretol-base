import { getRequestContext } from '@cloudflare/next-on-pages'
import { OGPResult } from 'api-types'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
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
