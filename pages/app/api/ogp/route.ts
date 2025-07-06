import { getCloudflareContext } from '@opennextjs/cloudflare'
import { OGPResult } from 'api-types'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { env } = getCloudflareContext()

  const response = await env.OGP_RPC.fetch(request)

  if (response.status !== 200) {
    console.log('error: ', await response.text())
    const errorResponse = {
      success: false,
    } as OGPResult
    return Response.json(errorResponse)
  }

  return Response.json(await response.json())
}
