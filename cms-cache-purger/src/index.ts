import { type Request as WorkerRequest, type ExecutionContext, type KVNamespace } from '@cloudflare/workers-types'
import crypto from 'node:crypto'
import { Content, WebhookPayload } from 'api-types'
import { generateContentKey, generateInfoKey, generateTagsKey } from 'cms-cache-key-gen'

export interface Env {
  CMS_CACHE: KVNamespace
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
    console.log(bodyJSON)

    if (bodyJSON.service !== 'maretol-blog') {
      return new Response('OK', { status: 200 })
    }

    if (bodyJSON.api === 'contents') {
      if (bodyJSON.type === 'new') {
        // ブログのメインコンテンツに新規作成があった場合
        // contentsのキャッシュを削除する
        if (bodyJSON.contents.new.status.includes('PUBLISH')) {
          console.log('start deleteContentsCache')
          await deleteContentsCache(env)
        } else {
          console.log('status is not PUBLISH')
        }
      } else if (bodyJSON.type === 'edit') {
        if (isDraftToPublish(bodyJSON.contents.old, bodyJSON.contents.new)) {
          // 下書きから公開に変更された場合
          // contentsのキャッシュを削除する
          console.log('start deleteContentsCache')
          await deleteContentsCache(env)
        } else {
          // ブログのメインコンテンツに編集があった場合
          // 対象のIDのコンテンツのキャッシュを削除する
          console.log('start deleteContentCache')
          console.log('id: ' + bodyJSON.id)
          await deleteContentCache(env, bodyJSON.id)
        }
      } else if (bodyJSON.type === 'delete') {
        // ブログのメインコンテンツに削除があった場合
        // contentsのキャッシュと対象のIDのコンテンツのキャッシュを削除する
        console.log('start deleteContentsCache')
        await deleteContentsCache(env)
        console.log('start deleteContentCache')
        console.log('id: ' + bodyJSON.id)
        await deleteContentCache(env, bodyJSON.id)
      }
    } else if (bodyJSON.api === 'info') {
      // infoのキャッシュを削除する
      const cacheKey = generateInfoKey()
      await deleteCache(env, cacheKey)
    } else if (bodyJSON.api === 'categories') {
      // categoryのキャッシュを削除する
      const cacheKey = generateTagsKey()
      await deleteCache(env, cacheKey)
    }

    return new Response('OK', { status: 200 })
  },
}

async function deleteContentsCache(env: Env) {
  const list = await env.CMS_CACHE.list({ prefix: 'contents_' })
  // すべての contents_ から始まるキーを削除する
  const deleteKeys = await Promise.all(
    list.keys.map(async (key) => {
      await env.CMS_CACHE.delete(key.name)
      return key.name
    })
  )
  deleteKeys.forEach((key) => {
    console.log(`Deleted: ${key}`)
  })

  if (list.list_complete === false) {
    // キャッシュがまだある場合は再帰的に削除する
    await deleteContentsCache(env)
  }
}

async function deleteContentCache(env: Env, contentID: string) {
  const cacheKey = generateContentKey(contentID)
  await deleteCache(env, cacheKey)
}

async function deleteCache(env: Env, cacheKey: string) {
  const cache = await env.CMS_CACHE.get(cacheKey)
  if (!cache) {
    // キャッシュがなかったのでパス
    return
  }
  await env.CMS_CACHE.delete(cacheKey)
}

function isDraftToPublish(old: Content | null, newContent: Content): boolean {
  if (!old) {
    return false
  }
  if (old.status.includes('PUBLISH')) {
    // すでに公開済み
    return false
  }
  // 未公開で、下書き状態から公開状態に変更された場合
  return old.status.includes('DRAFT') && newContent.status.includes('PUBLISH')
}
