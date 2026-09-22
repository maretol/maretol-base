import Modal from './modal'
import fetchCiteImage from '@/lib/api/cite_image'
import { getCMSContent } from '@/lib/api/workers'
import { parseDraftKey } from '@/lib/searchParams'
import { ParsedContent } from 'api-types'

// パラレルルート・セマンティクスルート機能で、ブログ内から画像をクリックしたときはこのモーダルが表示される
export default async function ImageModal(props: {
  params: Promise<{ article_id: string; src: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams
  const articleID = params.article_id
  const draftKey = parseDraftKey(searchParams)
  const imageSrc = decodeImageSrc(params.src)
  if (imageSrc === null) {
    // 不正な src はモーダルを開かない（並列スロット内なので notFound() で記事ごと 404 にはしない）
    return null
  }

  // src はパスから来るので、記事の画像（通常・写真・引用）として実在する URL のときだけ扱う
  // これがないと任意の URL を取得して KV に保存するプロキシ、または画像変換の踏み台になる（issue #1296）
  const content = await getCMSContent(articleID, draftKey)
  if (!content?.id || !isImageOfArticle(content.parsed_content, imageSrc)) {
    return null
  }

  // 外部画像（自サイトのドメイン以外）の場合はサーバー側で取得した data URL を渡す
  let imageData: string | null = null
  if (isExternalImageURL(imageSrc)) {
    const result = await fetchCiteImage(imageSrc)
    imageData = result.success ? result.data : null
  }

  return <Modal imageSrc={imageSrc} imageData={imageData} />
}

// image.tsx / cite_image.tsx が btoa で作る base64url（パディングなし）を元の URL に戻す
// btoa は Latin-1 のバイト列を出すので、その逆変換も latin1 でデコードする
function decodeImageSrc(src: string): string | null {
  // Next が params をデコード済みなので通常はそのままだが、`%` を含む不正な値で URIError にならないようにする
  let raw = src
  try {
    raw = decodeURIComponent(src)
  } catch {
    return null
  }
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) {
    return null
  }
  const base64 = raw.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(base64, 'base64').toString('latin1')
}

// 記事内で画像として使われている URL か。通常画像・写真は text、引用画像は sub_texts.url に入っている
function isImageOfArticle(parsedContent: ParsedContent[], url: string): boolean {
  return parsedContent.some((c) => {
    if (c.p_option === 'image' || c.p_option === 'photo') {
      return c.text === url
    }
    if (c.p_option === 'cite_image') {
      return c.sub_texts?.url === url
    }
    return false
  })
}

// 自サイト（maretol.xyz とそのサブドメイン）以外を外部とみなす。部分文字列ではなくホスト名で判定する
function isExternalImageURL(src: string): boolean {
  let url: URL
  try {
    url = new URL(src)
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false
  }
  const host = url.hostname
  return host !== 'maretol.xyz' && !host.endsWith('.maretol.xyz')
}
