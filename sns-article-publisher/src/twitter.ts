import crypto from 'node:crypto'

type TwitterAuthInfo = {
  bearerToken: string
  apiKey: string
  apiSecret: string
  accessToken: string
  accessTokenSecret: string
}

async function PostTweet(authInfo: TwitterAuthInfo, tweet: string): Promise<void> {
  const endpoint = 'https://api.x.com/2/tweets'
  const nonce = Math.random().toString(36).substring(2, 26)
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

  const body = JSON.stringify({ text: tweet })

  const headers = new Headers()
  headers.set('Authorization', `OAuth ${oauthHeader}`)
  headers.set('User-Agent', 'maretol base bot')
  headers.set('Content-Type', 'application/json')
  headers.set('Content-length', body.length.toString())
  headers.set('Host', 'api.x.com')
  headers.set('Accept', '*/*')
  headers.set('Connection', 'close')

  const response = await fetch(endpoint, {
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

  console.log(await response.text())
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
