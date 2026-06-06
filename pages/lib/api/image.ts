import { getCloudflareContext } from '@opennextjs/cloudflare'
import { imageCacheDuration } from '@/lib/static'
import { isKVCacheEnabled } from '@/lib/env'
import getR2ObjectByURL from '@/lib/api/r2'

// blurプレースホルダ画像(data URL)と、アスペクト比を扱うための元画像の縦横サイズ
export type BlurredImageMetadata = {
  imageBase64: string
  width: number
  height: number
}

export default async function fetchBlurredImageAndMetadata(src: string): Promise<BlurredImageMetadata | null> {
  const { env } = await getCloudflareContext({ async: true })
  if (isKVCacheEnabled()) {
    const cache = await env.IMAGE_CACHE.get(src)
    if (cache) {
      const cached = parseCachedMetadata(cache)
      if (cached) {
        return cached
      }
      // 旧フォーマット(data URL文字列のみ)はcache missとして扱い、下で再生成してJSONへ移行する
    }
  }

  try {
    const imageObject = await getR2ObjectByURL(src)
    const imageBytes = await imageObject.arrayBuffer()

    // 画像変換APIでblur用の小さい画像を生成する前に、元画像のサイズを取得する
    const info = await env.IMAGE_TRANSFORMATION.info(new Response(imageBytes).body!)
    if (!('width' in info)) {
      // svgなどのベクター画像はinfoにwidth/heightがない
      // 現状svg画像は扱わないので、エラー扱いにする
      throw new Error(`Unsupported image type for blur generation (missing width/height in info): ${src}`)
    }

    // 画像データを変換APIに渡して、blur用の小さい画像を生成する
    const image = await env.IMAGE_TRANSFORMATION.input(new Response(imageBytes).body!)
      .transform({
        blur: 100,
      })
      .transform({
        width: 16,
      })
      .output({
        format: 'image/webp',
        quality: 20,
      })
    const imageArrayBuffer = await image.response().arrayBuffer()
    const blobBase64 = Buffer.from(imageArrayBuffer).toString('base64')
    const imageBase64 = 'data:image/webp;base64,' + blobBase64

    const result: BlurredImageMetadata = {
      imageBase64,
      width: info.width,
      height: info.height,
    }

    if (isKVCacheEnabled()) {
      try {
        await env.IMAGE_CACHE.put(src, JSON.stringify(result), {
          expirationTtl: imageCacheDuration,
        })
      } catch (e) {
        // キャッシュ保存に失敗した場合でもAPIの結果は返すためのラッパー
        console.error(`[lib/api/image.ts] Cache put error for key ${src}:`, e)
      }
    }

    return result
  } catch (e) {
    // プレースホルダ画像の生成失敗で記事本体の描画まで落とさないよう、nullを返してグレースフルに劣化させる
    console.error(`[lib/api/image.ts] Error fetching image from R2 for URL ${src}:`, e)
    return null
  }
}

// キャッシュ値をBlurredImageMetadataへ復元する。
// 旧フォーマット(data URL文字列のみ)はJSONとしてparseできず、shapeも満たさないためnullを返す。
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
    // 旧フォーマットはJSON.parseで例外になるので、cache missとして扱う
  }
  return null
}
