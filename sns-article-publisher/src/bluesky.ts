import { AtpAgent, RichText } from '@atproto/api'

type BlueSkyAuthInfo = {
  username: string
  password: string
}

type BlueSkyOGPInfo = {
  title: string
  description: string
  url: string
  image?: string
}

async function PostBlueSky(authInfo: BlueSkyAuthInfo, post: string, ogp: BlueSkyOGPInfo): Promise<void> {
  const agent = new AtpAgent({
    service: 'https://bsky.social',
  })

  const richText = new RichText({ text: post })
  await richText.detectFacets(agent)

  await agent.login({ identifier: authInfo.username, password: authInfo.password })

  let blob = null
  try {
    const ogpImageSrc = getOgpImageSrc(ogp.image)
    const imageBuffer = await fetchImageBuffer(ogpImageSrc)

    const uploadedImage = await agent.uploadBlob(imageBuffer, { encoding: 'image/webp' })
    blob = uploadedImage.data.blob
  } catch (error) {
    console.error('Error fetching or uploading OGP image:', error)
    blob = null
  }

  await agent.post({
    text: richText.text,
    facets: richText.facets,
    embed: {
      $type: 'app.bsky.embed.external',
      external: {
        title: ogp.title,
        description: ogp.description,
        uri: ogp.url,
        thumb: blob || undefined,
      },
    },
  })

  console.log(`BlueSky post: ${post}`)
}

function getOgpImageSrc(ogpImage?: string): string {
  const cdnBypass = 'https://www.maretol.xyz/cdn-cgi/image/w=1200,h=630format=webp,q=70/'
  if (ogpImage) {
    // image が設定されている場合それをBypassの画像にして返却
    const src = ogpImage
    return cdnBypass + src
  }
  // image が設定されていない場合はデフォルトの画像を返却
  const src = 'https://r2.maretol.xyz/assets/maretol_base_ogp.png'
  return cdnBypass + src
}

async function fetchImageBuffer(src: string): Promise<Uint8Array> {
  const res = await fetch(src)
  const imageBlob = await res.blob()
  const blogArrayBuffer = await imageBlob.bytes()

  return blogArrayBuffer
}

export default PostBlueSky

export { BlueSkyAuthInfo }
