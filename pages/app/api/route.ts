import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { env } = getCloudflareContext()

  return Response.json({ status: 'ok', env_host: env.HOST, req: request.url })
}
