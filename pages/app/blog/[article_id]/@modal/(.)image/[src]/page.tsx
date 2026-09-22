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

  // 外部画像（http/https始まりかつ自サイトでない）の場合はキャッシュからデータを取得
  const isExternalImage =
    imageSrc.startsWith('http') && !imageSrc.includes('maretol.xyz') && !imageSrc.includes('r2.maretol.xyz')
  let imageData: string | null = null
  if (isExternalImage) {
    // src はパスから来るので、記事に /cite_image として実在する URL のときだけサーバー側で取得する
    // これがないと任意の URL を取得して KV に保存するプロキシになる（issue #1296）
    const content = await getCMSContent(articleID, draftKey)
    if (!content?.id || !isCiteImageOfArticle(content.parsed_content, imageSrc)) {
      return null
    }
    const result = await fetchCiteImage(imageSrc)
    imageData = result.success ? result.data : null
  }

  return <Modal imageSrc={imageSrc} imageData={imageData} />
}

// image.tsx / cite_image.tsx が btoa で作る base64url（パディングなし）を元の URL に戻す
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
  return Buffer.from(base64, 'base64').toString('utf-8')
}

function isCiteImageOfArticle(parsedContent: ParsedContent[], url: string) {
  return parsedContent.some((c) => c.p_option === 'cite_image' && c.sub_texts?.url === url)
}
