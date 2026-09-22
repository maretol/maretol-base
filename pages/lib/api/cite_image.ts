import { getCloudflareContext } from '@opennextjs/cloudflare'
import { imageCacheDuration } from '@/lib/static'
import { isKVCacheEnabled } from '@/lib/env'

export interface FetchCiteImageResult {
  success: boolean
  data: string | null
  contentType: string | null
}

const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const CACHE_KEY_PREFIX = 'cite:'
// 外部への fetch の待ち時間。引用元が応答しないときに記事全体の描画を止めないための上限
const FETCH_TIMEOUT_MS = 5 * 1000
// KV の値は 25MiB まで。data URL(base64 で 4/3 倍 + prefix)がそこに収まる元画像のサイズを上限にする
// これを超える画像はキャッシュできない上に HTML にもそのまま埋め込まれるので、取得自体を打ち切って失敗扱いにする
const KV_VALUE_MAX_BYTES = 25 * 1024 * 1024
const DATA_URL_PREFIX_MAX_BYTES = 64 // `data:image/jpeg;base64,` 程度
const MAX_IMAGE_BYTES = Math.floor(((KV_VALUE_MAX_BYTES - DATA_URL_PREFIX_MAX_BYTES) * 3) / 4)

export default async function fetchCiteImage(url: string): Promise<FetchCiteImageResult> {
  try {
    const { env, ctx } = await getCloudflareContext({ async: true })
    // KV のキーは 512B までなので、URL そのものではなくハッシュをキーにする
    const cacheKey = CACHE_KEY_PREFIX + (await sha256Hex(url))

    // キャッシュ確認
    if (isKVCacheEnabled()) {
      const cached = await env.IMAGE_CACHE.get(cacheKey)
      if (cached) {
        // キャッシュからcontent-typeを抽出
        const match = cached.match(/^data:(image\/[^;]+);base64,/)
        const contentType = match ? match[1] : 'image/jpeg'
        return { success: true, data: cached, contentType }
      }
    }

    // 外部URLから画像取得
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!response.ok) {
      console.error(`[lib/api/cite_image.ts] Image fetch error: ${response.status} for ${url}`)
      return { success: false, data: null, contentType: null }
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !SUPPORTED_FORMATS.some((format) => contentType.startsWith(format))) {
      console.error(`[lib/api/cite_image.ts] Unsupported image format: ${contentType} for ${url}`)
      return { success: false, data: null, contentType: null }
    }

    // Content-Length が分かるときは本文を読む前に弾く
    const contentLength = Number(response.headers.get('content-length'))
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
      console.warn(`[lib/api/cite_image.ts] Image too large: ${contentLength} bytes for ${url}`)
      return { success: false, data: null, contentType: null }
    }

    // Content-Length がない・偽っているケースに備えて、読みながら上限を超えた時点で打ち切る
    const bytes = await readBodyWithLimit(response, MAX_IMAGE_BYTES)
    if (bytes === null) {
      console.warn(`[lib/api/cite_image.ts] Image exceeded ${MAX_IMAGE_BYTES} bytes while reading: ${url}`)
      return { success: false, data: null, contentType: null }
    }

    // base64エンコード
    const base64 = Buffer.from(bytes).toString('base64')
    const dataUrl = `data:${contentType};base64,${base64}`

    // KVにキャッシュ保存。書き込みの完了はレスポンスに必要ないので待たない
    if (isKVCacheEnabled()) {
      ctx.waitUntil(
        env.IMAGE_CACHE.put(cacheKey, dataUrl, { expirationTtl: imageCacheDuration }).catch((cacheError) => {
          // キャッシュ失敗してもdata URLは返す
          console.error(`[lib/api/cite_image.ts] Failed to cache image: ${cacheError}`)
        }),
      )
    }

    return { success: true, data: dataUrl, contentType }
  } catch (error) {
    console.error(`[lib/api/cite_image.ts] Error fetching cite image: ${error}`)
    return { success: false, data: null, contentType: null }
  }
}

// 本文を読み進めながら合計サイズを数え、上限を超えたら読むのをやめて null を返す
async function readBodyWithLimit(response: Response, limit: number): Promise<Uint8Array | null> {
  if (!response.body) {
    return new Uint8Array(0)
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
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
