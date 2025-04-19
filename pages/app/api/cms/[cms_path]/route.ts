import { getLocalEnv } from '@/lib/env'
import { getCloudflareContext } from '@opennextjs/cloudflare'

export const dynamic = 'force-dynamic'

// cms_path の値によって処理が変わるが、それらはWorker側で吸収しているのでそのまま渡す
export async function GET(request: Request) {
  console.log('何か呼ばれてる疑惑あり')
  if (getLocalEnv() === 'local') {
    return await fetchLocal(request)
  }
  const { env } = getCloudflareContext()

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

  const { env, ctx } = getCloudflareContext()
  const API_KEY = env.CMS_FETCHER_API_KEY
  const CMS_API_KEY = process.env.CMS_API_KEY || ''
  const CMS_API_KEY_BD = process.env.CMS_API_KEY_BD || ''

  const response = await cms.fetchCMSLocal.default.fetch(request, { API_KEY, CMS_API_KEY, CMS_API_KEY_BD }, ctx)

  return Response.json(await response.json())
}
