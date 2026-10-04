import { Buffer } from 'node:buffer'
import { env, waitUntil } from 'cloudflare:workers'
import { sha256Hex } from '@/lib/hex'

// 引用画像（外部サイトの画像）をサーバー側で取得し、data URL にして返す。
// 閲覧者のブラウザから引用元へ直接リクエストさせないためと、引用元が消えても一定期間表示を保つため

const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const CACHE_KEY_PREFIX = 'cite:'
// 取得できた画像を保持する秒数
const IMAGE_CACHE_TTL = 7 * 24 * 60 * 60
// 取得失敗を表すキャッシュ値の prefix。data URL と区別できればよいので理由を続けて入れる
const FAILURE_VALUE_PREFIX = 'error:'
// 取得失敗を保持する秒数。引用元が落ちている・応答しない間、描画のたびに取りに行かないための短い保持
const FAILURE_CACHE_TTL = 10 * 60
// 外部への fetch の待ち時間。引用元が応答しないときに記事全体の描画を止めないための上限
const FETCH_TIMEOUT_MS = 5 * 1000
// KV の値は 25MiB まで。data URL（base64 で 4/3 倍 + prefix）がそこに収まる元画像のサイズを上限にする。
// これを超える画像はキャッシュできない上に HTML にもそのまま埋め込まれるので、取得自体を打ち切って失敗扱いにする
const KV_VALUE_MAX_BYTES = 25 * 1024 * 1024
const DATA_URL_PREFIX_MAX_BYTES = 64 // `data:image/jpeg;base64,` 程度
const MAX_IMAGE_BYTES = Math.floor(((KV_VALUE_MAX_BYTES - DATA_URL_PREFIX_MAX_BYTES) * 3) / 4)

// 取得できたら data URL、できなかったら null
export async function fetchCiteImage(url: string): Promise<string | null> {
  // KV のキーは 512B までなので、URL そのものではなくハッシュをキーにする
  const cacheKey = CACHE_KEY_PREFIX + (await sha256Hex(url))

  try {
    const cached = await env.IMAGE_CACHE.get(cacheKey)
    if (cached) {
      // 直近で失敗しているときは、負キャッシュの間は取りに行かない
      return cached.startsWith(FAILURE_VALUE_PREFIX) ? null : cached
    }
  } catch (e) {
    console.error(`[lib/api/cite_image.ts] Cache get error for ${url}:`, e)
  }

  // 失敗の理由は負キャッシュの値に残す
  let failure: string
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    const contentType = response.headers.get('content-type')
    const contentLength = Number(response.headers.get('content-length'))
    if (!response.ok) {
      failure = `status ${response.status}`
    } else if (!contentType || !SUPPORTED_FORMATS.some((format) => contentType.startsWith(format))) {
      failure = `unsupported content-type ${contentType}`
    } else if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
      // Content-Length が分かるときは本文を読む前に弾く
      failure = `too large ${contentLength} bytes`
    } else {
      // Content-Length がない・偽っているケースに備えて、読みながら上限を超えた時点で打ち切る
      const bytes = await readBodyWithLimit(response, MAX_IMAGE_BYTES)
      if (bytes === null) {
        failure = `exceeded ${MAX_IMAGE_BYTES} bytes while reading`
      } else if (bytes.byteLength === 0) {
        failure = 'empty body'
      } else {
        const dataURL = `data:${contentType};base64,${bytes.toString('base64')}`
        saveCache(cacheKey, dataURL, IMAGE_CACHE_TTL)
        return dataURL
      }
    }
  } catch (e) {
    // タイムアウト（TimeoutError）や接続失敗もここに来る
    failure = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  }

  console.error(`[lib/api/cite_image.ts] Image fetch failed for ${url}: ${failure}`)
  saveCache(cacheKey, FAILURE_VALUE_PREFIX + failure, FAILURE_CACHE_TTL)
  return null
}

// KV への保存。書き込みの完了はレスポンスに必要ないので待たない。保存に失敗しても取得結果はそのまま返す
function saveCache(cacheKey: string, value: string, expirationTtl: number): void {
  waitUntil(
    env.IMAGE_CACHE.put(cacheKey, value, { expirationTtl }).catch((e) => {
      console.error(`[lib/api/cite_image.ts] Cache put error for key ${cacheKey}:`, e)
    }),
  )
}

// 本文を読み進めながら合計サイズを数え、上限を超えたら読むのをやめて null を返す
async function readBodyWithLimit(response: Response, limit: number): Promise<Buffer | null> {
  if (!response.body) {
    return Buffer.alloc(0)
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > limit) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks)
}
