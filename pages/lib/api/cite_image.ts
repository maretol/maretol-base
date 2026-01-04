import { getCloudflareContext } from '@opennextjs/cloudflare'
import { imageCacheDuration } from '@/lib/static'

export interface FetchCiteImageResult {
  success: boolean
  data: string | null
  contentType: string | null
}

const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const CACHE_KEY_PREFIX = 'cite:'
const MAX_CACHE_SIZE = 25 * 1024 * 1024 // 25MB

export default async function fetchCiteImage(url: string): Promise<FetchCiteImageResult> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    const cacheKey = CACHE_KEY_PREFIX + url

    // キャッシュ確認
    const cached = await env.IMAGE_CACHE.get(cacheKey)
    if (cached) {
      // キャッシュからcontent-typeを抽出
      const match = cached.match(/^data:(image\/[^;]+);base64,/)
      const contentType = match ? match[1] : 'image/jpeg'
      return { success: true, data: cached, contentType }
    }

    // 外部URLから画像取得
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`[lib/api/cite_image.ts] Image fetch error: ${response.status} for ${url}`)
      return { success: false, data: null, contentType: null }
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !SUPPORTED_FORMATS.some((format) => contentType.startsWith(format))) {
      console.error(`[lib/api/cite_image.ts] Unsupported image format: ${contentType} for ${url}`)
      return { success: false, data: null, contentType: null }
    }

    const blob = await response.blob()

    // サイズ制限チェック
    if (blob.size > MAX_CACHE_SIZE) {
      console.warn(`[lib/api/cite_image.ts] Image too large to cache: ${blob.size} bytes for ${url}`)
      // キャッシュせずにdata URLを返す
      const arrayBuffer = await blob.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      const dataUrl = `data:${contentType};base64,${base64}`
      return { success: true, data: dataUrl, contentType }
    }

    // base64エンコード
    const arrayBuffer = await blob.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const dataUrl = `data:${contentType};base64,${base64}`

    // KVにキャッシュ保存
    try {
      await env.IMAGE_CACHE.put(cacheKey, dataUrl, {
        expirationTtl: imageCacheDuration,
      })
    } catch (cacheError) {
      console.error(`[lib/api/cite_image.ts] Failed to cache image: ${cacheError}`)
      // キャッシュ失敗してもdata URLは返す
    }

    return { success: true, data: dataUrl, contentType }
  } catch (error) {
    console.error(`[lib/api/cite_image.ts] Error fetching cite image: ${error}`)
    return { success: false, data: null, contentType: null }
  }
}
