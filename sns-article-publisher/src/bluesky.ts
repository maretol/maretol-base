import { AtpAgent, RichText } from '@atproto/api'
import { Env } from '.'

type BlueSkyAuthInfo = {
  username: string
  password: string
}

type BlueSkyOGPInfo = {
  title: string
  description: string
  url: string
  image: string | null | undefined
}

const defaultOGPSrc = 'https://r2.maretol.xyz/assets/maretol_base_ogp.png'

async function PostBlueSky(env: Env, authInfo: BlueSkyAuthInfo, postText: string, ogp: BlueSkyOGPInfo): Promise<void> {
  const agent = new AtpAgent({
    service: 'https://bsky.social',
  })

  const richText = new RichText({ text: postText })
  await richText.detectFacets(agent)

  await agent.login({ identifier: authInfo.username, password: authInfo.password })

  let blob = null
  try {
    const ogpImageSrc = ogp.image || defaultOGPSrc
    const imageStream = await fetchImageBuffer(ogpImageSrc)
    const imageBuffer = await translateImage(env, imageStream)

    const uploadedImage = await agent.uploadBlob(imageBuffer, { encoding: 'image/webp' })
    blob = uploadedImage.data.blob
  } catch (error) {
    console.error('Error fetching or uploading OGP image:', error)
    blob = null
  }

  const post = {
    text: richText.text,
    facets: richText.facets,
    embed: {
      $type: 'app.bsky.embed.external',
      external: {
        title: ogp.title,
        uri: ogp.url,
        description: 'Maretol Baseの記事を投稿しました',
        thumb: blob || undefined,
      },
    },
  }

  await agent.post(post)

  console.log(`BlueSky post: `)
  console.log(post)
}

async function fetchImageBuffer(src: string): Promise<ReadableStream> {
  console.log('Fetching image from: ' + src)
  const res = await fetch(src)
  if (!res.ok) {
    console.error('Failed to fetch image: ', src)
    throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`)
  }
  const imageBlob = await res.blob()
  const imageStream = imageBlob.stream()

  return imageStream
}

async function translateImage(env: Env, imageStream: ReadableStream): Promise<Uint8Array> {
  const response = (
    await env.IMAGES.input(imageStream)
      .transform({
        width: 1200,
        height: 630,
      })
      .output({
        format: 'image/webp',
        quality: 70,
      })
  ).response()
  if (!response.ok) {
    console.error('Failed to transform image:', response.status, response.statusText)
    throw new Error(`Failed to transform image: ${response.status} ${response.statusText}`)
  }
  const blob = await response.blob()
  const arrayBuffer = await blob.bytes()
  return arrayBuffer
}

export default PostBlueSky

export { BlueSkyAuthInfo }
