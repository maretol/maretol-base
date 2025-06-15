import { AtpAgent, RichText } from '@atproto/api'

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

async function PostBlueSky(authInfo: BlueSkyAuthInfo, postText: string, ogp: BlueSkyOGPInfo): Promise<void> {
  const agent = new AtpAgent({
    service: 'https://bsky.social',
  })

  const richText = new RichText({ text: postText })
  await richText.detectFacets(agent)

  await agent.login({ identifier: authInfo.username, password: authInfo.password })

  let blob = null
  try {
    const ogpImageSrc = getOgpImageSrc(ogp.image)
    const { contentType, imageBuffer } = await fetchImageBuffer(ogpImageSrc)

    const uploadedImage = await agent.uploadBlob(imageBuffer, { encoding: contentType || 'image/webp' })
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
        description: ogp.description,
        uri: ogp.url,
        thumb: blob || undefined,
      },
    },
  }

  await agent.post(post)

  console.log(`BlueSky post: `)
  console.log(post)
}

function getOgpImageSrc(ogpImage: string | null | undefined): string {
  const cdnBypass = 'https://www.maretol.xyz/cdn-cgi/image/w=1200,h=630,format=webp,q=70/'
  if (ogpImage === null || ogpImage === undefined || ogpImage === '') {
    // image が設定されている場合それをBypassの画像にして返却
    const src = ogpImage
    return cdnBypass + src
  }
  // image が設定されていない場合はデフォルトの画像を返却
  const src = 'https://r2.maretol.xyz/assets/maretol_base_ogp.png'
  return cdnBypass + src
}

async function fetchImageBuffer(src: string): Promise<{ contentType: string | null; imageBuffer: Uint8Array }> {
  console.log('Fetching image from: ' + src)
  const res = await fetch(src)
  if (!res.ok) {
    console.error('Failed to fetch image: ', src)
    throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`)
  }
  const contentType = res.headers.get('Content-Type')
  const imageBlob = await res.blob()
  const imageBuffer = await imageBlob.bytes()

  console.log('contentType: ' + contentType)
  console.log('imageBuffer: ' + imageBuffer.byteLength + ' bytes')
  return { contentType, imageBuffer }
}

export default PostBlueSky

export { BlueSkyAuthInfo }
