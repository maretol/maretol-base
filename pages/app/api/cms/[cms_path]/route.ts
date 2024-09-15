import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// cms_path の値によって処理が変わるが、それらはWorker側で吸収しているのでそのまま渡す
export async function GET(request: Request) {
  const { env } = getRequestContext()

  const response = await env.CMS_FETCHER.fetch(request.clone())

  if (response.status !== 200) {
    return new Response(await response.text(), { status: response.status })
  }

  return Response.json(await response.json())
}
