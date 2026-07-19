import { type Request as WorkerRequest, type ExecutionContext, type KVNamespace } from '@cloudflare/workers-types'
import crypto from 'node:crypto'
import { WebhookPayload } from 'api-types'
import Blog from './blog'
import Comic from './comic'
import Illust from './illust'

export interface Env {
  CMS_CACHE: KVNamespace
  API_KEY: string
  SECRET: string
}

const serviceList = ['maretol-blog', 'maretol-comic', 'maretol-illust']

export default {
  async fetch(request: WorkerRequest, env: Env, ctx: ExecutionContext): Promise<Response> {
    // APIキーの判定
    const apiKey = request.headers.get('x-mcms-api-key') // 正確には X-MCMS-API-Key
    if (apiKey !== env.API_KEY) {
      return new Response('Bad Request', { status: 400 })
    }

    // signatrueがない場合弾く
    const signature = request.headers.get('x-microcms-signature')
    if (!signature) {
      return new Response('Bad Request', { status: 400 })
    }
    const body = await request.text()

    // signatureの検証
    const expectedSignature = crypto.createHmac('sha256', env.SECRET).update(body).digest('hex')
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return new Response('Bad Request', { status: 400 })
    }

    const bodyJSON = JSON.parse(body) as WebhookPayload
    console.log(bodyJSON)

    if (!serviceList.includes(bodyJSON.service)) {
      return new Response('OK', { status: 200 })
    }

    if (bodyJSON.service === 'maretol-blog') {
      const blog = new Blog(env, ctx)
      return blog.purgeCache(bodyJSON)
    } else if (bodyJSON.service === 'maretol-comic') {
      const comic = new Comic(env, ctx)
      return comic.purgeCache(bodyJSON)
    } else if (bodyJSON.service === 'maretol-illust') {
      const illust = new Illust(env, ctx)
      return illust.purgeCache(bodyJSON)
    }

    return new Response('OK', { status: 200 })
  },
}
