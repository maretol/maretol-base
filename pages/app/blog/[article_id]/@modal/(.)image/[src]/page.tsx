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
  // これがないと任意の URL を取得して KV に保存するプロキシになる（issue #1296）
  const content = await getCMSContent(articleID, draftKey)
  const image = content?.id ? findArticleImage(content.parsed_content, imageSrc) : null
  if (image === null) {
    return null
  }

  // 引用画像は外部サイトの画像なので、サーバー側で取得した data URL をモーダルに渡す
  // 通常画像・写真は自サイト（R2）の画像なので、クライアント側で画像変換を通して表示する
  const isExternalImage = image.p_option === 'cite_image'
  let imageData: string | null = null
  if (isExternalImage) {
    const result = await fetchCiteImage(imageSrc)
    imageData = result.success ? result.data : null
  }

  return <Modal imageSrc={imageSrc} imageData={imageData} isExternalImage={isExternalImage} />
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

// 記事内で画像として使われている URL に対応する parsed_content の項目を返す
// 通常画像・写真は text、引用画像は sub_texts.url に URL が入っている
function findArticleImage(parsedContent: ParsedContent[], url: string): ParsedContent | null {
  const image = parsedContent.find((c) => {
    if (c.p_option === 'image' || c.p_option === 'photo') {
      return c.text === url
    }
    if (c.p_option === 'cite_image') {
      return c.sub_texts?.url === url
    }
    return false
  })
  return image ?? null
}
