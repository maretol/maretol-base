import { getRequestContext } from '@cloudflare/next-on-pages'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { env } = getRequestContext()

  return Response.json({ status: 'ok', env_host: env.HOST, req: request.url })
}
