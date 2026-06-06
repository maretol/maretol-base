import { getCloudflareContext } from '@opennextjs/cloudflare'
import { imageCacheDuration } from '@/lib/static'
import { isKVCacheEnabled } from '@/lib/env'
import getR2ObjectByURL from '@/lib/api/r2'

export default async function fetchBlurredImage(src: string) {
  const { env } = await getCloudflareContext({ async: true })
  if (isKVCacheEnabled()) {
    const cache = await env.IMAGE_CACHE.get(src)
    if (cache) {
      return cache
    }
  }

  try {
    const imageObject = await getR2ObjectByURL(src)
    const body = imageObject.body
    if (!body) {
      throw new Error(`No body found for R2 object: ${src}`)
    }

    // blur=100,h=400,w=300,format=webp,q=low/
    const image = await env.IMAGE_TRANSFORMATION.input(body).transform({ blur: 100 }).transform({ width: 300 }).output({
      format: 'image/webp',
      quality: 20,
    })
    const imageArrayBuffer = await image.response().arrayBuffer()
    const blogBase64 = Buffer.from(imageArrayBuffer).toString('base64')
    const imageUrl = 'data:image/webp;base64,' + blogBase64

    if (isKVCacheEnabled()) {
      try {
        await env.IMAGE_CACHE.put(src, imageUrl, {
          expirationTtl: imageCacheDuration,
        })
      } catch (e) {
        // キャッシュ保存に失敗した場合でもAPIの結果は返すためのラッパー
        console.error(`[lib/api/image.ts] Cache put error for key ${src}:`, e)
      }
    }

    return imageUrl
  } catch (e) {
    // プレースホルダ画像の生成失敗で記事本体の描画まで落とさないよう、空文字を返してグレースフルに劣化させる
    console.error(`[lib/api/image.ts] Error fetching image from R2 for URL ${src}:`, e)
    return ''
  }
}
