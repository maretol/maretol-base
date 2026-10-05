import { timingSafeEqual } from 'node:crypto'
import { env } from 'cloudflare:workers'
import { bufferToHex } from '@/lib/hex'

// 限定公開記事の「解錠済み」を、署名付きの Cookie で持つ（現行サイトの pages/lib/secret_unlock.ts と同じ方式）
// - Cookie の値は HMAC-SHA256(`${articleID}:${secret_code}`, SECRET_ARTICLE_COOKIE_KEY) の hex
// - 解錠したときに発行し、以降は Cookie の検証だけで本文を表示する（コードの再入力は要らない）
// - secret_code を署名の対象に含めるので、コードを変えると既存の Cookie は自動的に無効になる
// - secret_code そのものは Cookie に保存しない

const COOKIE_PREFIX = 'secret_unlock_'
// Cookie を保持する秒数（30 日）
const MAX_AGE = 60 * 60 * 24 * 30
// 開発サーバーで、署名の鍵（Secrets Store）を読めないときに使う鍵
const DEV_SIGNING_KEY = 'test_dev_key'

export function unlockCookieName(articleID: string): string {
  return `${COOKIE_PREFIX}${articleID}`
}

// 解錠の Cookie の属性。path を記事の URL に限定するので、ほかのページへは送られない
export function unlockCookieOptions(articleID: string) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: `/blog/${articleID}`,
    maxAge: MAX_AGE,
  } as const
}

async function getSigningKey(): Promise<string> {
  // 鍵を読めない・空のときに既定の鍵を使うのは開発サーバーだけ
  if (import.meta.env.DEV) {
    const devKey = await env.SECRET_ARTICLE_COOKIE_KEY.get().catch(() => null)
    return devKey || DEV_SIGNING_KEY
  }
  // それ以外では、推測できる鍵で Cookie を偽造されないよう、エラーにする。
  // 読み取りの失敗（Secrets Store の一時的な障害など）は、原因がログに残るよう例外のまま上げる
  const key = await env.SECRET_ARTICLE_COOKIE_KEY.get()
  if (!key) {
    throw new Error('SECRET_ARTICLE_COOKIE_KEY is not set')
  }
  return key
}

// 解錠の Cookie に入れる署名。
// articleID は CMS のコンテンツ ID（コロンを含まない）なので、`:` で区切っても一意になる
export async function signUnlock(articleID: string, secretCode: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(await getSigningKey()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return bufferToHex(await crypto.subtle.sign('HMAC', key, encoder.encode(`${articleID}:${secretCode}`)))
}

// 2 つの文字列を SHA-256 のダイジェストにしてから、定数時間で比べる。
// ダイジェストは常に同じ長さ（32 バイト）なので、入力の長さの違いが処理時間に出ない
export async function secureEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ])
  return timingSafeEqual(new Uint8Array(digestA), new Uint8Array(digestB))
}

// Cookie の値が、いまの secret_code に対応する有効な署名かどうか
export async function isValidUnlockCookie(
  articleID: string,
  secretCode: string,
  cookieValue: string,
): Promise<boolean> {
  return secureEqual(cookieValue, await signUnlock(articleID, secretCode))
}
