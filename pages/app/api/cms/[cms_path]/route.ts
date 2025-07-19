import { getCloudflareContext } from '@opennextjs/cloudflare'

export const dynamic = 'force-dynamic'

// cms_path の値によって処理が変わるが、それらはWorker側で吸収しているのでそのまま渡す
export async function GET(request: Request) {
  const { env } = await getCloudflareContext({ async: true })

  const clone = request.clone() as Request
  const response = await env.CMS_RPC.fetch(clone)

  if (response.status !== 200) {
    return new Response(await response.text(), { status: response.status })
  }

  return Response.json(await response.json())
}
