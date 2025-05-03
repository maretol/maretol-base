import PostTweet, { TwitterAuthInfo } from './twitter'
import PostBlueSky, { BlueSkyAuthInfo } from './bluesky'
import PostNostrKind1, { NostrAuthInfo } from './nostr'
import { SNSPubData } from 'api-types'
import { WorkerEntrypoint } from 'cloudflare:workers'

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

    await publish(env, articleURL, articleTitle, postMessage)

    return new Response('OK', { status: 200 })
  }

  async publish(pubData: SNSPubData): Promise<void> {
    const env = this.env

    const articleURL = pubData.article_url
    const articleTitle = pubData.article_title
    const postMessage = pubData.post_message

    this.ctx.waitUntil(publish(env, articleURL, articleTitle, postMessage))
    return
  }
}

async function publish(env: Env, articleURL: string, articleTitle: string, postMessage: string | null) {
  let postText = ''
  if (postMessage === undefined || postMessage === null || postMessage === '') {
    postText = `投稿しました : ${articleTitle}\n${articleURL}`
  } else {
    postText = `${postMessage}\n\n投稿しました : ${articleTitle}\n${articleURL}`
  }

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
