import { type Request as WorkerRequest, type ExecutionContext, type KVNamespace } from '@cloudflare/workers-types'
import crypto from 'node:crypto'
import { WebhookPayload } from './cms_webhook_types'
import { generateContentKey, generateInfoKey, generateTagsKey } from 'cms-cache-key-gen'

export interface Env {
  CACHE_KV_NAMESPACE: KVNamespace
  API_KEY: string
  SECRET: string
}

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

    if (bodyJSON.service !== 'maretol-blog') {
      return new Response('OK', { status: 200 })
    }

    if (bodyJSON.api === 'contents') {
      if (bodyJSON.type === 'new') {
        // ブログのメインコンテンツに新規作成があった場合
        // contentsのキャッシュを削除する
        await deleteContentsCache(env)
      } else if (bodyJSON.type === 'edit') {
        // ブログのメインコンテンツに編集があった場合
        // 対象のIDのコンテンツのキャッシュを削除する
        await deleteContentCache(env, bodyJSON.id)
      } else if (bodyJSON.type === 'delete') {
        // ブログのメインコンテンツに削除があった場合
        // contentsのキャッシュと対象のIDのコンテンツのキャッシュを削除する
        await deleteContentsCache(env)
        await deleteContentCache(env, bodyJSON.id)
      }
    } else if (bodyJSON.api === 'info') {
      // infoのキャッシュを削除する
      const cacheKey = generateInfoKey()
      await deleteCache(env, cacheKey)
    } else if (bodyJSON.api === 'category') {
      // categoryのキャッシュを削除する
      const cacheKey = generateTagsKey()
      await deleteCache(env, cacheKey)
    }

    return new Response('OK', { status: 200 })
  },
}

async function deleteContentsCache(env: Env) {
  const list = await env.CACHE_KV_NAMESPACE.list<string>({ prefix: 'contents_' })
  // すべての contents_ から始まるキーを削除する
  list.keys.forEach(async (key) => {
    await env.CACHE_KV_NAMESPACE.delete(key.name)
  })
}

async function deleteContentCache(env: Env, contentID: string) {
  const cacheKey = generateContentKey(contentID)
  const cache = await env.CACHE_KV_NAMESPACE.get(cacheKey)
  if (!cache) {
    // キャッシュがなかったのでパス
    return
  }
  await env.CACHE_KV_NAMESPACE.delete(cacheKey)
}

async function deleteCache(env: Env, cacheKey: string) {
  const cache = await env.CACHE_KV_NAMESPACE.get(cacheKey)
  if (!cache) {
    // キャッシュがなかったのでパス
    return
  }
  await env.CACHE_KV_NAMESPACE.delete(cacheKey)
}
