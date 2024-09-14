import { getRequestContext } from '@cloudflare/next-on-pages'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest, {}: { params: { cms_path: string } }) {
  const { env } = getRequestContext()

  const response = await env.CMS_FETCHER.fetch(request)

  return Response.json(response.body)
}
