import { btoa } from 'node:buffer'
import crypto from 'node:crypto'

type TwitterAuthInfo = {
  bearerToken: string
  apiKey: string
  apiSecret: string
  accessToken: string
  accessTokenSecret: string
}

type BearerResponseType = {
  token_type: string
  access_token: string
}

type PostTweetResponseType = {
  data: {
    id: string
    text: string
  }
}

async function PostTweet(authInfo: TwitterAuthInfo, tweet: string): Promise<void> {
  await PostTweet_v1(authInfo, tweet)
}

async function PostTweet_v2(authInfo: TwitterAuthInfo, tweet: string): Promise<void> {
  const host = 'https://api.x.com'
  const apiKey = authInfo.apiKey
  const apiSecret = authInfo.apiSecret

  const bearerBody = 'grant_type=client_credentials'

  const basicCredentials = btoa(`${apiKey}:${apiSecret}`)
  const bearerHeader = new Headers()
  bearerHeader.set('Authorization', `Basic ${basicCredentials}`)
  bearerHeader.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8')
  bearerHeader.set('Content-length', bearerBody.length.toString())

  console.log(bearerBody)

  const bearerResponse = await fetch(`${host}/oauth2/token`, {
    method: 'POST',
    headers: bearerHeader,
    body: bearerBody,
  })

  if (!bearerResponse.ok) {
    console.error(`Error: ${bearerResponse.status} ${bearerResponse.statusText}`)
    const errorText = await bearerResponse.text()
    console.error(errorText)
    throw new Error(`Twitter API request failed: ${errorText}`)
  }

  const bearerResponseJson = await bearerResponse.json<BearerResponseType>()
  const tokenTyppe = bearerResponseJson.token_type
  const accessToken = bearerResponseJson.access_token

  const postEndpoint = `${host}/2/tweets`
  const postBody = JSON.stringify({ text: tweet })
  const postHeader = new Headers()
  postHeader.set('Authorization', `Bearer ${accessToken}`)
  postHeader.set('Content-Type', 'application/json')

  const postResponse = await fetch(postEndpoint, {
    method: 'POST',
    headers: postHeader,
    body: postBody,
  })
  if (!postResponse.ok) {
    console.error(`Error: ${postResponse.status} ${postResponse.statusText}`)
    const errorText = await postResponse.text()
    console.error(errorText)
    throw new Error(`Twitter API request failed: ${errorText}`)
  }
  const postResponseJson = await postResponse.json<PostTweetResponseType>()
  const postId = postResponseJson.data.id
  console.log(`Tweet posted successfully with ID: ${postId}`)

  return
}

async function PostTweet_v1(authInfo: TwitterAuthInfo, tweet: string): Promise<void> {
  const endpoint = 'https://api.x.com/2/tweets'
  const nonce = Math.random().toString(36).substring(2, 26)
  const timestamp = Math.floor(Date.now() / 1000).toString()

  const signature = createSignature(nonce, timestamp, authInfo, endpoint)

  const url = new URL(endpoint)

  const oauthHeader = [
    `oauth_consumer_key="${authInfo.apiKey}"`,
    `oauth_nonce="${nonce}"`,
    `oauth_signature="${signature}"`,
    `oauth_signature_method="HMAC-SHA1"`,
    `oauth_timestamp="${timestamp}"`,
    `oauth_token="${authInfo.accessToken}"`,
    `oauth_version="1.0"`,
  ].join(', ')

  const body = JSON.stringify({ text: tweet })

  const headers = new Headers()
  headers.set('Authorization', `OAuth ${oauthHeader}`)
  headers.set('User-Agent', 'maretol base bot')
  headers.set('Content-Type', 'application/json')
  headers.set('Content-length', body.length.toString())
  headers.set('Host', 'api.x.com')
  headers.set('Accept', '*/*')
  headers.set('Connection', 'close')

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body,
  })

  if (!response.ok) {
    console.error(`Error: ${response.status} ${response.statusText}`)
    const errorText = await response.text()
    console.error(errorText)
    throw new Error(`Twitter API request failed: ${errorText}`)
  }

  console.log(response.text())
  return
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

export default PostTweet

export { TwitterAuthInfo }
