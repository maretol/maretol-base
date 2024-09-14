import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { env } = getRequestContext()

  console.log('request :', request.clone())
  const response = await env.OGP_FETCHER.fetch(request.clone())
  console.log('response :', response)

  return Response.json(response.body)
}
