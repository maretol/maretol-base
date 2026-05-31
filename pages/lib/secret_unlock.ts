// 限定公開記事の「解錠状態」を署名付き Cookie で保持するためのサーバ専用ユーティリティ
//   - Cookie 値は HMAC-SHA256(articleID, SECRET_ARTICLE_COOKIE_KEY) の hex
//   - 解錠時に発行し、以降の閲覧は Cookie 検証のみで本文を表示する（コード再入力不要）
//   - secret_code そのものは Cookie に保存しない（解錠の瞬間だけ照合に使う）

import { cookies } from 'next/headers'
import { getSecretArticleCookieKey } from './env'
import { getCloudflareContext } from '@opennextjs/cloudflare'

const COOKIE_PREFIX = 'secret_unlock_'
const MAX_AGE = 60 * 60 * 24 * 30 // 30日

function cookieName(articleID: string) {
  return `${COOKIE_PREFIX}${articleID}`
}

async function getSigningKey(): Promise<string> {
  const { env } = await getCloudflareContext({ async: true })
  const key = await getSecretArticleCookieKey(env)
  if (!key) {
    throw new Error('SECRET_ARTICLE_COOKIE_KEY is not set')
  }
  return key
}

function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sign(articleID: string): Promise<string> {
  const keyData = new TextEncoder().encode(await getSigningKey())
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(articleID))
  return bufferToHex(signature)
}

// 長さ・内容のタイミング差を抑えた文字列比較
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

// 対象記事が解錠済み（有効な署名 Cookie を持つ）かどうか
export async function isArticleUnlocked(articleID: string): Promise<boolean> {
  const store = await cookies()
  const cookie = store.get(cookieName(articleID))
  if (!cookie) {
    return false
  }
  try {
    const expected = await sign(articleID)
    return constantTimeEqual(cookie.value, expected)
  } catch {
    return false
  }
}

// 対象記事を解錠済みにする署名 Cookie を発行する（Server Action / Route Handler からのみ呼ぶ）
export async function setArticleUnlocked(articleID: string): Promise<void> {
  const store = await cookies()
  const signature = await sign(articleID)
  store.set(cookieName(articleID), signature, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: `/blog/${articleID}`,
    maxAge: MAX_AGE,
  })
}
