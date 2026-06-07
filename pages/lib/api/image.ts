import { getCloudflareContext } from '@opennextjs/cloudflare'
import { imageCacheDuration } from '@/lib/static'
import { isKVCacheEnabled, getLocalEnv } from '@/lib/env'
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
    // ローカル環境ではR2のBindingが使えないため、URL経由で取得する処理に切り替える
    const result =
      getLocalEnv() === 'local' ? await getLocalR2Image(src, env) : await generateBlurredImageMetadata(src, env)

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

// 本番環境向け: R2 Bindingから元画像を取得し、画像変換APIでblur画像とサイズを生成する
async function generateBlurredImageMetadata(src: string, env: CloudflareEnv): Promise<BlurredImageMetadata> {
  const imageObject = await getR2ObjectByURL(src)
  const [body1, body2] = imageObject.body.tee() // tee()で2本に分け、サイズ取得とblur生成で同時に消費する

  // 元画像サイズの取得(info)とblur画像の生成(input)を並列実行する。
  // tee()したストリームを両方同時に読むことで内部バッファの滞留も減り、変換待ち時間を重ねられる。
  const infoPromise = env.IMAGE_TRANSFORMATION.info(body1)
  const blurArrayBufferPromise = env.IMAGE_TRANSFORMATION.input(body2)
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
    .then((image) => image.response().arrayBuffer())

  const [info, imageArrayBuffer] = await Promise.all([infoPromise, blurArrayBufferPromise])
  if (!('width' in info)) {
    // svgなどのベクター画像はinfoにwidth/heightがない
    // 現状svg画像は扱わないので、エラー扱いにする
    throw new Error(`Unsupported image type for blur generation (missing width/height in info): ${src}`)
  }

  const blobBase64 = Buffer.from(imageArrayBuffer).toString('base64')
  const imageBase64 = 'data:image/webp;base64,' + blobBase64

  return {
    imageBase64,
    width: info.width,
    height: info.height,
  }
}

// ローカル環境ではR2のBindingでデータ取得ができないため、URL経由で取得する
async function getLocalR2Image(src: string, env: CloudflareEnv): Promise<BlurredImageMetadata> {
  const imageSrc = 'https://www.maretol.xyz/cdn-cgi/image/blur=100,h=400,w=300,format=webp,q=low/' + src

  const image = await fetch(imageSrc)
  if (image.status !== 200) {
    console.error('Image fetch error:', image.status)
    throw new Error(`Failed to fetch image from URL: ${imageSrc}, status: ${image.status}`)
  }

  if (!image.body) {
    console.error('Image fetch error: no body in response')
    throw new Error(`Failed to fetch image from URL: ${imageSrc}, no body in response`)
  }

  const imageBytes = await image.arrayBuffer()
  const info = await env.IMAGE_TRANSFORMATION.info(new Response(imageBytes).body!)
  const blobBase64 = Buffer.from(imageBytes).toString('base64')
  const imageUrl = 'data:image/webp;base64,' + blobBase64

  return {
    imageBase64: imageUrl,
    width: 'width' in info ? info.width : 0,
    height: 'height' in info ? info.height : 0,
  }
}
