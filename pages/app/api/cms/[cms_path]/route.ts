import { getLocalEnv } from '@/lib/env'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// cms_path の値によって処理が変わるが、それらはWorker側で吸収しているのでそのまま渡す
export async function GET(request: Request) {
  if (getLocalEnv() === 'local') {
    return await fetchLocal(request)
  }

  const { env } = getRequestContext()

  const response = await env.CMS_FETCHER.fetch(request.clone())

  if (response.status !== 200) {
    return new Response(await response.text(), { status: response.status })
  }

  return Response.json(await response.json())
}

// ローカル実行時用
async function fetchLocal(request: Request) {
  const url = new URL(request.url)
  const path = url.pathname
  const query = url.search
  const localUrl = 'http://localhost:8787/api/' + path + query
  const response = await fetch(localUrl, { ...request })
  return Response.json(await response.json())
}
