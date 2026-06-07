import { getCloudflareContext } from '@opennextjs/cloudflare'

// CloudflareEnv のうち値が R2Bucket のキーだけを抽出
// => 'IMAGES' | 'BANDE_DESSINEE' | 'PHOTO' | 'SCREENSHOTS' | 'STATIC'
type R2BucketKey = {
  [K in keyof CloudflareEnv]: CloudflareEnv[K] extends R2Bucket ? K : never
}[keyof CloudflareEnv]

type R2URLMap = {
  domain: string
  bucketName: R2BucketKey
}

const r2URLMap: R2URLMap[] = [
  { domain: 'r2.maretol.xyz', bucketName: 'IMAGES' },
  { domain: 'bandedessinee.maretol.xyz', bucketName: 'BANDE_DESSINEE' }, // マンガのみで、blur取得では使ってない
  { domain: 'photos.maretol.xyz', bucketName: 'PHOTO' },
  { domain: 'capture.maretol.xyz', bucketName: 'SCREENSHOTS' },
  { domain: 'static.maretol.xyz', bucketName: 'STATIC' }, // 現状使ってない
]

export default async function getR2ObjectByURL(imageURL: string) {
  const { env } = await getCloudflareContext({ async: true })

  const imageObject = getObjectKeyFromURL(imageURL)
  const bucketKey = imageObject.bucketName

  if (bucketKey === undefined) {
    throw new Error(`Bucket key not found for URL: ${imageURL}`)
  }

  const object = await env[bucketKey].get(imageObject.objectKey)
  if (!object) {
    throw new Error(`Object not found in R2: objectKey=${imageObject.objectKey} in bucket ${bucketKey}`)
  }

  return object
}

function getObjectKeyFromURL(imageURL: string): { bucketName: R2BucketKey; objectKey: string } {
  const url = new URL(imageURL)
  const domain = url.hostname
  const pathname = url.pathname
  const r2Info = r2URLMap.find((info) => info.domain === domain)
  if (!r2Info) {
    throw new Error(`Unknown R2 domain: ${domain}`)
  }
  const rawObjectKey = pathname.startsWith('/') ? pathname.slice(1) : pathname
  // pathname はURLエンコードされているため、デコードして保存時のキー（スペースや日本語など）と一致させる
  try {
    return { bucketName: r2Info.bucketName, objectKey: decodeURIComponent(rawObjectKey) }
  } catch (e) {
    throw new Error(`Failed to decode object key: ${rawObjectKey}`)
  }
}
