import { type Request as WorkerRequest, type ExecutionContext } from '@cloudflare/workers-types'
import PostTweet, { TwitterAuthInfo } from './twitter'
import PostBlueSky, { BlueSkyAuthInfo } from './bluesky'
import PostNostrKind1, { NostrAuthInfo } from './nostr'
import { SNSPubData } from 'api-types'

export interface Env {
  API_KEY: string

  TWI_API_KEY: string
  TWI_API_SECRET: string
  TWI_ACCESS_TOKEN: string
  TWI_ACCESS_TOKEN_SECRET: string

  BSKY_USERNAME: string
  BSKY_PASSWORD: string

  NOSTR_NSEC: string
}

export default {
  async fetch(request: WorkerRequest, env: Env, ctx: ExecutionContext): Promise<Response> {
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== env.API_KEY) {
      return new Response('internal server error', { status: 500 })
    }

    const body = await request.text()
    const bodyJSON = JSON.parse(body) as SNSPubData
    console.log(bodyJSON)

    const articleURL = bodyJSON.article_url
    const articleTitle = bodyJSON.article_title
    const postMessage = bodyJSON.post_message

    let postText = ''
    if (postMessage === undefined || postMessage === null || postMessage === '') {
      postText = `投稿しました : ${articleTitle}\n${articleURL}`
    } else {
      postText = `${postMessage}\n\n投稿しました : ${articleTitle}\n${articleURL}`
    }

    // 以下各種SNSへのポスト
    // 1. Twitter
    const twiAuth = createTwitterAuthInfo(env)
    try {
      await PostTweet(twiAuth, postText)
    } catch (e) {
      console.error('Error posting to Twitter:', e)
    }

    // 2. BlueSky
    const bskyAuth = createBlueSkyAuthInfo(env)
    try {
      await PostBlueSky(bskyAuth, postText)
    } catch (e) {
      console.error('Error posting to BlueSky:', e)
    }

    // 3. Mastodon
    // 4. Misskey

    // 5. nostr
    const nostrAuth = createNostrAuthInfo(env)
    try {
      await PostNostrKind1(nostrAuth, postText)
    } catch (e) {
      console.error('Error posting to nostr:', e)
    }

    return new Response('OK', { status: 200 })
  },
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
