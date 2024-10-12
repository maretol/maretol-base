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

  const clone = request.clone() as Request
  const response = await env.CMS_FETCHER.fetch(clone)

  if (response.status !== 200) {
    return new Response(await response.text(), { status: response.status })
  }

  return Response.json(await response.json())
}

// ローカル実行時用
async function fetchLocal(request: Request) {
  const cms = await import('cms-data-fetcher')

  const { env, ctx } = getRequestContext()
  const API_KEY = env.CMS_FETCHER_API_KEY
  const CMS_API_KEY = process.env.CMS_API_KEY || ''

  const response = await cms.fetchCMSLocal.default.fetch(request, { API_KEY, CMS_API_KEY }, ctx)

  return Response.json(await response.json())
}
