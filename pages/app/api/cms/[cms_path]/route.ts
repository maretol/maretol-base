import { getCloudflareContext } from '@opennextjs/cloudflare'

export const dynamic = 'force-dynamic'

// cms_path の値によって処理が変わるが、それらはWorker側で吸収しているのでそのまま渡す
export async function GET(request: Request) {
  const ua = request.headers.get('user-agent') || ''
  if (ua === 'Next.js Middleware') {
    return new Response('Next.js Middlewareからのリクエストは処理しません', { status: 400 })
  }

  const { env } = await getCloudflareContext({ async: true })
  const apiKey = env.CMS_FETCHER_API_KEY
  const headerApiKey = request.headers.get('x-api-key')
  if (apiKey !== headerApiKey) {
    return new Response('Invalid API Key', { status: 401 })
  }

  const clone = request.clone() as Request
  const response = await env.CMS_RPC.fetch(clone)

  if (response.status !== 200) {
    return new Response(await response.text(), { status: response.status })
  }

  return Response.json(await response.json())
}
