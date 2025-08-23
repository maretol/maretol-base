import crypto from 'node:crypto'
import { Env } from '.'

type TwitterAuthInfo = {
  apiKey: string
  apiSecret: string
  accessToken: string
  accessTokenSecret: string
}

type TweetContent = {
  text: string
  media?: {
    mediaIds?: string[]
  }
}

async function UploadImageMedia(authInfo: TwitterAuthInfo, imageBuffer: Uint8Array): Promise<string> {
  console.log('upload image to twitter')
  const endpoint = 'https://api.x.com/2/media/upload'

  const imageBase64 = Buffer.from(imageBuffer).toString('base64')

  const bodyObj: any = {
    media: imageBase64,
    media_category: 'tweet_image',
    media_type: 'image/webp',
  }

  const body = JSON.stringify(bodyObj)

  const oauthHeader = createAuthHeader(authInfo, endpoint)
  const headers = new Headers()
  headers.set('Authorization', `OAuth ${oauthHeader}`)
  headers.set('User-Agent', 'maretol base bot')
  headers.set('Content-Type', 'application/json')
  headers.set('Host', 'api.x.com')
  headers.set('Accept', '*/*')
  headers.set('Connection', 'close')

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body,
  })

  if (!response.ok) {
    console.error(`Error uploading media: ${response.status}`)
    console.error(await response.text())
    throw new Error(`Failed to upload media: ${response.status} ${response.statusText}`)
  }

  const res = (await response.json()) as any
  console.log('Media uploaded successfully:', res)
  return res.data.id
}

async function PostTweet(authInfo: TwitterAuthInfo, tweets: TweetContent[]): Promise<void> {
  console.log('post tweet to twitter')
  if (tweets.length === 0) {
    console.log('No tweets to post')
    return
  }
  const endpoint = 'https://api.x.com/2/tweets'

  let previousTweetId: string | null = null

  for (const tweet of tweets) {
    console.log('Posting tweet:', tweet)
    const oauthHeader = createAuthHeader(authInfo, endpoint)

    const tweetBody: any = { text: tweet.text }
    if (tweet.media?.mediaIds && tweet.media.mediaIds.length > 0) {
      tweetBody.media = { media_ids: tweet.media.mediaIds }
    }
    if (previousTweetId) {
      tweetBody.reply = { in_reply_to_tweet_id: previousTweetId }
    }
    const body = JSON.stringify(tweetBody)

    const headers = new Headers()
    headers.set('Authorization', `OAuth ${oauthHeader}`)
    headers.set('User-Agent', 'maretol base bot')
    headers.set('Content-Type', 'application/json')
    headers.set('Content-length', body.length.toString())
    headers.set('Host', 'api.x.com')
    headers.set('Accept', '*/*')
    headers.set('Connection', 'close')

    console.log('sending request to Twitter API')
    console.log(body)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
    })
    console.log('request sent to Twitter API')

    if (!response.ok) {
      console.error(`Error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(errorText)
      throw new Error(`Twitter API request failed: ${errorText}`)
    }

    const responseData = (await response.json()) as any
    console.log(responseData)
    previousTweetId = responseData.data?.id || null
    console.log('Tweet posted successfully:', responseData.data?.id)
  }

  return
}

function createAuthHeader(authInfo: TwitterAuthInfo, endpoint: string): string {
  const nonce = crypto.randomBytes(16).toString('base64url')
  const timestamp = Math.floor(Date.now() / 1000).toString()

  const signature = createSignature(nonce, timestamp, authInfo, endpoint)

  const oauthHeader = [
    `oauth_consumer_key="${authInfo.apiKey}"`,
    `oauth_nonce="${nonce}"`,
    `oauth_signature="${signature}"`,
    `oauth_signature_method="HMAC-SHA1"`,
    `oauth_timestamp="${timestamp}"`,
    `oauth_token="${authInfo.accessToken}"`,
    `oauth_version="1.0"`,
  ].join(', ')

  return oauthHeader
}

function createSignature(nonce: string, timestamp: string, authInfo: TwitterAuthInfo, endpoint: string) {
  const apiKey = authInfo.apiKey
  const accessToken = authInfo.accessToken

  const oauth_consumer_key = apiKey
  const oauth_nonce = nonce
  const oauth_signature_method = 'HMAC-SHA1'
  const oauth_timestamp = timestamp
  const oauth_token = accessToken
  const oauth_version = '1.0'

  const paramsString = [
    `oauth_consumer_key=${encodeURIComponent(oauth_consumer_key)}`,
    `oauth_nonce=${encodeURIComponent(oauth_nonce)}`,
    `oauth_signature_method=${encodeURIComponent(oauth_signature_method)}`,
    `oauth_timestamp=${encodeURIComponent(oauth_timestamp)}`,
    `oauth_token=${encodeURIComponent(oauth_token)}`,
    `oauth_version=${encodeURIComponent(oauth_version)}`,
  ].join('&')

  const baseString = `POST&${encodeURIComponent(endpoint)}&` + encodeURIComponent(paramsString)

  const signingKey = `${encodeURIComponent(authInfo.apiSecret)}&${encodeURIComponent(authInfo.accessTokenSecret)}`

  const hmac = crypto.createHmac('sha1', signingKey)
  const signature = hmac.update(baseString).digest('base64')
  return encodeURIComponent(signature)
}

function createTwitterAuthInfo(env: Env) {
  return {
    apiKey: env.TWI_API_KEY,
    apiSecret: env.TWI_API_SECRET,
    accessToken: env.TWI_ACCESS_TOKEN,
    accessTokenSecret: env.TWI_ACCESS_TOKEN_SECRET,
  } as TwitterAuthInfo
}

export { UploadImageMedia, PostTweet, createTwitterAuthInfo, TwitterAuthInfo, TweetContent }
