import { getCloudflareContext } from '@opennextjs/cloudflare'
import { OGPResult } from 'api-types'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext({ async: true })

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
