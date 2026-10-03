import { Buffer } from 'node:buffer'
import { env } from 'cloudflare:workers'
import { getR2ObjectByURL } from './r2'

// 画像キャッシュの保持期間（秒）
const IMAGE_CACHE_TTL = 7 * 24 * 60 * 60

// blur プレースホルダ画像（data URL）と、アスペクト比を扱うための元画像の縦横サイズ
export type BlurredImageMetadata = {
  imageBase64: string
  width: number
  height: number
}

// 記事本文の画像の寸法と blur を返す。失敗したら null（記事本体の描画は続ける）
export async function fetchBlurredImageAndMetadata(src: string): Promise<BlurredImageMetadata | null> {
  // KV の読み出しに失敗しても生成へ進む
  try {
    const cache = await env.IMAGE_CACHE.get(src)
    if (cache) {
      const cached = parseCachedMetadata(cache)
      if (cached) {
        return cached
      }
      // 旧フォーマット（data URL 文字列のみ）は cache miss として扱い、下で再生成して JSON へ移行する
    }
  } catch (e) {
    console.error(`[lib/api/image.ts] Cache get error for key ${src}:`, e)
  }

  try {
    const result = await generateBlurredImageMetadata(src)
    try {
      await env.IMAGE_CACHE.put(src, JSON.stringify(result), { expirationTtl: IMAGE_CACHE_TTL })
    } catch (e) {
      console.error(`[lib/api/image.ts] Cache put error for key ${src}:`, e)
    }
    return result
  } catch (e) {
    console.error(`[lib/api/image.ts] Error fetching image from R2 for URL ${src}:`, e)
    return null
  }
}

function parseCachedMetadata(raw: string): BlurredImageMetadata | null {
  try {
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed.imageBase64 === 'string' &&
      typeof parsed.width === 'number' &&
      typeof parsed.height === 'number'
    ) {
      return parsed
    }
  } catch {
    // 旧フォーマットは JSON.parse で例外になるので、cache miss として扱う
  }
  return null
}

// R2 から元画像を取得し、Images binding で blur 画像とサイズを生成する
async function generateBlurredImageMetadata(src: string): Promise<BlurredImageMetadata> {
  const imageObject = await getR2ObjectByURL(src)
  // tee() で 2 本に分け、サイズ取得と blur 生成で同時に消費する
  const [body1, body2] = imageObject.body.tee()

  const infoPromise = env.IMAGE_TRANSFORMATION.info(body1)
  const blurArrayBufferPromise = env.IMAGE_TRANSFORMATION.input(body2)
    .transform({ blur: 100 })
    .transform({ width: 16 })
    .output({ format: 'image/webp', quality: 20 })
    .then((image) => image.response().arrayBuffer())

  const [info, imageArrayBuffer] = await Promise.all([infoPromise, blurArrayBufferPromise])
  if (!('width' in info)) {
    // svg などのベクター画像は info に width / height がない。現状 svg 画像は扱わないのでエラー扱いにする
    throw new Error(`Unsupported image type for blur generation (missing width/height in info): ${src}`)
  }

  return {
    imageBase64: 'data:image/webp;base64,' + Buffer.from(imageArrayBuffer).toString('base64'),
    width: info.width,
    height: info.height,
  }
}
