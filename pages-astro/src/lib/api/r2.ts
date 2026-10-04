import { env } from 'cloudflare:workers'

type R2BucketKey = 'IMAGES' | 'BANDE_DESSINEE' | 'PHOTO' | 'SCREENSHOTS' | 'STATIC'

const r2URLMap: { domain: string; bucketName: R2BucketKey }[] = [
  { domain: 'r2.maretol.xyz', bucketName: 'IMAGES' },
  { domain: 'bandedessinee.maretol.xyz', bucketName: 'BANDE_DESSINEE' },
  { domain: 'photos.maretol.xyz', bucketName: 'PHOTO' },
  { domain: 'capture.maretol.xyz', bucketName: 'SCREENSHOTS' },
  { domain: 'static.maretol.xyz', bucketName: 'STATIC' },
]

// 公開 URL から R2 のオブジェクトを取得する
export async function getR2ObjectByURL(imageURL: string): Promise<R2ObjectBody> {
  const { bucketName, objectKey } = getObjectKeyFromURL(imageURL)
  const object = await env[bucketName].get(objectKey)
  if (!object) {
    throw new Error(`Object not found in R2: objectKey=${objectKey} in bucket ${bucketName}`)
  }
  return object
}

function getObjectKeyFromURL(imageURL: string): { bucketName: R2BucketKey; objectKey: string } {
  const url = new URL(imageURL)
  const r2Info = r2URLMap.find((info) => info.domain === url.hostname)
  if (!r2Info) {
    throw new Error(`Unknown R2 domain: ${url.hostname}`)
  }
  const rawObjectKey = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname
  // pathname は URL エンコードされているため、デコードして保存時のキー（スペースや日本語など）と一致させる
  try {
    return { bucketName: r2Info.bucketName, objectKey: decodeURIComponent(rawObjectKey) }
  } catch {
    throw new Error(`Failed to decode object key: ${rawObjectKey}`)
  }
}
