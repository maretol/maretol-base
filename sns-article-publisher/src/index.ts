import PostTweet, { TwitterAuthInfo } from './twitter'
import PostBlueSky, { BlueSkyAuthInfo } from './bluesky'
import PostNostrKind1, { NostrAuthInfo } from './nostr'
import { Content, WebhookPayload } from 'api-types'
import { WorkerEntrypoint } from 'cloudflare:workers'
import crypto from 'node:crypto'

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
}

const TARGET = {
  twitter: true,
  bluesky: true,
  nostr: true,
  mastodon: false,
  misskey: false,
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

    if (!publishNecessary(bodyJSON)) {
      console.log('publishNecessary is false. end')
      return new Response('OK', { status: 200 })
    }
    console.log('publishNecessary is true. start publish')

    const newContent = bodyJSON.contents.new.publishValue

    const articleURL = `https://www.maretol.xyz/blog/${newContent.id}`
    const articleTitle = newContent.title
    const postMessage = newContent.sns_text

    console.log('articleURL: ' + articleURL)
    console.log('articleTitle: ' + articleTitle)
    console.log('postMessage: ' + postMessage)
    console.log('publish wait until')
    this.ctx.waitUntil(publish(env, articleURL, articleTitle, postMessage))

    return new Response('OK', { status: 200 })
  }
}

async function publish(env: Env, articleURL: string, articleTitle: string, postMessage: string | null) {
  let postText = ''
  if (postMessage === undefined || postMessage === null || postMessage === '') {
    postText = `投稿しました : ${articleTitle} | Maretol Base\n${articleURL}`
  } else {
    postText = `${postMessage}\n\n投稿しました : ${articleTitle} | Maretol Base\n${articleURL}`
  }
  console.log('postText: ' + postText)

  // 以下各種SNSへのポスト
  // 1. Twitter
  if (TARGET['twitter']) {
    console.log('post to Twitter')
    const twiAuth = createTwitterAuthInfo(env)
    try {
      await PostTweet(twiAuth, postText)
    } catch (e) {
      console.error('Error posting to Twitter:', e)
    }
  } else {
    console.log('skip Twitter')
  }

  // 2. BlueSky
  if (TARGET['bluesky']) {
    console.log('post to BlueSky')
    const bskyAuth = createBlueSkyAuthInfo(env)
    try {
      await PostBlueSky(bskyAuth, postText)
    } catch (e) {
      console.error('Error posting to BlueSky:', e)
    }
  } else {
    console.log('skip BlueSky')
  }

  // 3. Mastodon
  // 4. Misskey

  // 5. nostr
  if (TARGET['nostr']) {
    console.log('post to nostr')
    const nostrAuth = createNostrAuthInfo(env)
    try {
      await PostNostrKind1(nostrAuth, postText)
    } catch (e) {
      console.error('Error posting to nostr:', e)
    }
  } else {
    console.log('skip nostr')
  }
}

function createTwitterAuthInfo(env: Env) {
  return {
    apiKey: env.TWI_API_KEY,
    apiSecret: env.TWI_API_SECRET,
    accessToken: env.TWI_ACCESS_TOKEN,
    accessTokenSecret: env.TWI_ACCESS_TOKEN_SECRET,
  } as TwitterAuthInfo
}

function createBlueSkyAuthInfo(env: Env) {
  return {
    username: env.BSKY_USERNAME,
    password: env.BSKY_PASSWORD,
  } as BlueSkyAuthInfo
}

function createNostrAuthInfo(env: Env) {
  return {
    nsec: env.NOSTR_NSEC,
  } as NostrAuthInfo
}

function publishNecessary(bodyJSON: WebhookPayload): boolean {
  if (bodyJSON.service !== 'maretol-blog') {
    return false
  }
  if (bodyJSON.api !== 'contents') {
    return false
  }
  return (
    bodyJSON.type === 'new' ||
    (bodyJSON.type === 'edit' && isDraftToPublish(bodyJSON.contents.old, bodyJSON.contents.new))
  )
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
