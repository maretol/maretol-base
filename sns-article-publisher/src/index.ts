import { WebhookPayload } from 'api-types'
import { WorkerEntrypoint } from 'cloudflare:workers'
import crypto from 'node:crypto'
import postTrigger from './blog'

export interface Env {
  API_KEY: string

  TWI_API_KEY: string
  TWI_API_SECRET: string
  TWI_ACCESS_TOKEN: string
  TWI_ACCESS_TOKEN_SECRET: string

  BSKY_USERNAME: string
  BSKY_PASSWORD: string

  NOSTR_NSEC: string

  SNS_PUB_CMS_KEY: string
  SNS_PUB_CMS_SECRET: string

  MISSKEY_API_TOKEN: string

  IMAGES: ImagesBinding
}

const TARGET = {
  twitter: true,
  bluesky: true,
  nostr: true,
  mastodon: false,
  misskey: true,
}

export default class Publisher extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    const env = this.env

    // APIキーの判定
    const apiKey = request.headers.get('x-mcms-api-key') // 正確には X-MCMS-API-Key
    const key = env.SNS_PUB_CMS_KEY
    if (apiKey !== key) {
      return new Response('internal server error', { status: 500 })
    }
    console.log('api key check is ok')

    // signatureがない場合弾く
    const signature = request.headers.get('x-microcms-signature')
    if (!signature) {
      return new Response('Bad Request', { status: 400 })
    }
    console.log('signature header check is ok')

    const body = await request.text()
    const secret = env.SNS_PUB_CMS_SECRET

    // signatureの検証
    const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex')
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return new Response('Bad Request', { status: 400 })
    }
    console.log('signature check is ok')

    const bodyJSON = JSON.parse(body) as WebhookPayload
    console.log(bodyJSON)

    switch (bodyJSON.service) {
      case 'maretol-blog':
        // ここに投稿処理を移したい
        await postTrigger(bodyJSON, env, this.ctx)
        break
      case 'maretol-comic':
        break
      case 'maretol-illust':
        break
      default:
    }

    return new Response('OK', { status: 200 })
  }
}
