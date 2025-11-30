import { getCloudflareContext } from '@opennextjs/cloudflare'

export async function getClarityID() {
  try {
    const { env } = await getCloudflareContext({ async: true })
    const clarityID = await env.CLARITY_ID.get()

    return clarityID
  } catch (e) {
    console.error(e)
  }
  return null
}
