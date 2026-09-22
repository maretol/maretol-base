import { getCloudflareContext } from '@opennextjs/cloudflare'
import { imageCacheDuration, MINUTE } from '@/lib/static'
import { isKVCacheEnabled } from '@/lib/env'
import { sha256Hex } from '@/lib/hex'

export interface FetchCiteImageResult {
  success: boolean
  data: string | null
  contentType: string | null
}

const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const CACHE_KEY_PREFIX = 'cite:'
// 取得失敗を表すキャッシュ値の prefix。data URL と区別できればよいので理由を続けて入れる
const FAILURE_VALUE_PREFIX = 'error:'
// 失敗の負キャッシュの保持期間。引用元が落ちている・応答しない間、描画のたびに取りに行かないための短い保持
// 通常はプレビューで確認した時点で成功がキャッシュされるので、本番で失敗に当たるのは引用元側の障害のとき
const FAILURE_CACHE_TTL = 10 * MINUTE
// 外部への fetch の待ち時間。引用元が応答しないときに記事全体の描画を止めないための上限
const FETCH_TIMEOUT_MS = 5 * 1000
// KV の値は 25MiB まで。data URL(base64 で 4/3 倍 + prefix)がそこに収まる元画像のサイズを上限にする
// これを超える画像はキャッシュできない上に HTML にもそのまま埋め込まれるので、取得自体を打ち切って失敗扱いにする
const KV_VALUE_MAX_BYTES = 25 * 1024 * 1024
const DATA_URL_PREFIX_MAX_BYTES = 64 // `data:image/jpeg;base64,` 程度
const MAX_IMAGE_BYTES = Math.floor(((KV_VALUE_MAX_BYTES - DATA_URL_PREFIX_MAX_BYTES) * 3) / 4)

const FAILURE: FetchCiteImageResult = { success: false, data: null, contentType: null }

export default async function fetchCiteImage(url: string): Promise<FetchCiteImageResult> {
  let env: CloudflareEnv
  let ctx: ExecutionContext
  let cacheKey: string
  try {
    ;({ env, ctx } = await getCloudflareContext({ async: true }))
    // KV のキーは 512B までなので、URL そのものではなくハッシュをキーにする
    cacheKey = CACHE_KEY_PREFIX + (await sha256Hex(url))

    // キャッシュ確認
    if (isKVCacheEnabled()) {
      const cached = await env.IMAGE_CACHE.get(cacheKey)
      if (cached) {
        if (cached.startsWith(FAILURE_VALUE_PREFIX)) {
          // 直近で失敗しているので、負キャッシュの間は取りに行かない
          return FAILURE
        }
        // キャッシュからcontent-typeを抽出
        const match = cached.match(/^data:(image\/[^;]+);base64,/)
        const contentType = match ? match[1] : 'image/jpeg'
        return { success: true, data: cached, contentType }
      }
    }
  } catch (error) {
    console.error(`[lib/api/cite_image.ts] Cache get error for ${url}: ${error}`)
    return FAILURE
  }

  // 外部URLから画像取得。失敗の理由は負キャッシュの値に残す
  let failure: string
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!response.ok) {
      failure = `status ${response.status}`
    } else {
      const contentType = response.headers.get('content-type')
      const contentLength = Number(response.headers.get('content-length'))
      if (!contentType || !SUPPORTED_FORMATS.some((format) => contentType.startsWith(format))) {
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
          const dataUrl = `data:${contentType};base64,${bytes.toString('base64')}`
          saveCache(env, ctx, cacheKey, dataUrl, imageCacheDuration)
          return { success: true, data: dataUrl, contentType }
        }
      }
    }
  } catch (error) {
    // タイムアウト（TimeoutError）や接続失敗もここに来る。「レスポンスなし」として負キャッシュする
    failure = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  }

  console.error(`[lib/api/cite_image.ts] Image fetch failed for ${url}: ${failure}`)
  saveCache(env, ctx, cacheKey, FAILURE_VALUE_PREFIX + failure, FAILURE_CACHE_TTL)
  return FAILURE
}

// KV への保存。書き込みの完了はレスポンスに必要ないので waitUntil に渡して待たない
// 保存に失敗しても取得結果はそのまま返すため、ここでは例外を外に出さない
function saveCache(
  env: CloudflareEnv,
  ctx: ExecutionContext,
  cacheKey: string,
  value: string,
  expirationTtl: number,
): void {
  if (!isKVCacheEnabled()) return
  try {
    ctx.waitUntil(
      env.IMAGE_CACHE.put(cacheKey, value, { expirationTtl }).catch((error) => {
        console.error(`[lib/api/cite_image.ts] Cache put error for key ${cacheKey}: ${error}`)
      }),
    )
  } catch (error) {
    console.error(`[lib/api/cite_image.ts] Cache put error for key ${cacheKey}: ${error}`)
  }
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
