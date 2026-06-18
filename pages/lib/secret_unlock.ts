// 限定公開記事の「解錠状態」を署名付き Cookie で保持するためのサーバ専用ユーティリティ
//   - Cookie 値は HMAC-SHA256(`${articleID}:${secret_code}`, SECRET_ARTICLE_COOKIE_KEY) の hex
//   - 解錠時に発行し、以降の閲覧は Cookie 検証のみで本文を表示する（コード再入力不要）
//   - secret_code を署名対象に含めるため、パスフレーズ変更時は既存 Cookie が自動的に無効化される
//   - secret_code そのものは Cookie に保存しない（HMAC 経由でのみ反映する）

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

async function sign(articleID: string, secretCode: string): Promise<string> {
  const keyData = new TextEncoder().encode(await getSigningKey())
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  // articleID と secret_code の両方を署名対象にすることで、パスフレーズ変更時に既存 Cookie を失効させる。
  // articleID は CMS のコンテンツ ID（コロンを含まない）のため `:` を区切りに使っても一意性は保たれる。
  const message = `${articleID}:${secretCode}`
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
  return bufferToHex(signature)
}

// 2つの文字列を SHA-256 でダイジェスト化してから定数時間比較する。
// ダイジェストは常に固定長(32byte)になるため入力長の差がタイミングに出ず、
// 生の secret_code を直接走査することもない。
export async function secureEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder()
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ])
  const ua = new Uint8Array(da)
  const ub = new Uint8Array(db)
  let result = 0
  for (let i = 0; i < ua.length; i++) {
    result |= ua[i] ^ ub[i]
  }
  return result === 0
}

// 対象記事が解錠済み（現在の secret_code に対応する有効な署名 Cookie を持つ）かどうか
export async function isArticleUnlocked(articleID: string, secretCode: string): Promise<boolean> {
  const store = await cookies()
  const cookie = store.get(cookieName(articleID))
  if (!cookie) {
    return false
  }
  try {
    const expected = await sign(articleID, secretCode)
    return await secureEqual(cookie.value, expected)
  } catch {
    return false
  }
}

// 対象記事を解錠済みにする署名 Cookie を発行する（Server Action / Route Handler からのみ呼ぶ）
export async function setArticleUnlocked(articleID: string, secretCode: string): Promise<void> {
  const store = await cookies()
  const signature = await sign(articleID, secretCode)
  store.set(cookieName(articleID), signature, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: `/blog/${articleID}`,
    maxAge: MAX_AGE,
  })
}
