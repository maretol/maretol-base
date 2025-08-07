import { getCloudflareContext } from '@opennextjs/cloudflare'

export default async function fetchBlurredImage(src: string) {
  const { env } = await getCloudflareContext({ async: true })
  const cache = await env.IMAGE_CACHE.get(src)
  if (cache) {
    return cache
  }

  const imageSrc = 'https://www.maretol.xyz/cdn-cgi/image/blur=100,h=400,w=300,format=webp,q=low/' + src

  const image = await fetch(imageSrc)
  if (image.status !== 200) {
    console.error('Image fetch error:', image.status)
    return ''
  }

  const imageBlob = await image.blob()
  const blogArrayBuffer = await imageBlob.arrayBuffer()
  const blogBase64 = Buffer.from(blogArrayBuffer).toString('base64')
  const imageUrl = 'data:image/webp;base64,' + blogBase64

  await env.IMAGE_CACHE.put(src, imageUrl, {
    expirationTtl: 7 * 60 * 60 * 24, // Cache for 7 day
  })

  return imageUrl
}
