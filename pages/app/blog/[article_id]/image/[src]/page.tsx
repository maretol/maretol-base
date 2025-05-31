// パラレルルート・セマンティクスルート機能で、画像のURLに直接アクセスした場合は画像ページが表示される

import { getCMSContent } from '@/lib/api/workers'
import { contentsAPIResult } from 'api-types'
import { rewriteImageURL } from '@/lib/image'
import { ogpImageOption } from '@/lib/static'
import { ImageArticle } from '@/components/large/article'
import { metadata } from '@/app/layout'
import { Metadata } from 'next'
import { getHostname } from '@/lib/env'

// metadata定義
export async function generateMetadata(props: {
  params: Promise<{ article_id: string; src: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const searchParams = await props.searchParams
  const params = await props.params
  const articleID = params.article_id
  const draftKey = searchParams['draftKey']
  const imageSrcBase64 = decodeURIComponent(params.src)
  const src = Buffer.from(imageSrcBase64, 'base64').toString('utf-8')

  const content: contentsAPIResult = await getCMSContent(articleID, draftKey)
  const ogpImage = content.ogp_image
  const sumnail = rewriteImageURL(ogpImageOption, src)
  const description = content.parsed_content
    .slice(0, 5)
    .map((c) => c.text)
    .join(' ')
  const twitterCard = ogpImage === null || ogpImage === undefined ? 'summary' : 'summary_large_image'

  return {
    ...metadata,
    title: `IMAGE: ${content.title} | Maretol Base`,
    description: content.title,
    twitter: {
      ...metadata.twitter,
      card: twitterCard,
      title: `IMAGE: ${content.title} | Maretol Base`,
      description: description,
      images: [sumnail],
    },
    openGraph: {
      ...metadata.openGraph,
      title: `IMAGE: ${content.title} | Maretol Base`,
      description: description,
      url: `${getHostname()}/blog/${articleID}`,
      images: [sumnail],
    },
  } as Metadata
}

export default async function ImagePage(props: {
  params: Promise<{ article_id: string; src: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const searchParams = await props.searchParams
  const params = await props.params
  // base64エンコーディングだが、パスパラメータに入った時点でURIエンコードもされているため先にそのデコードをする
  const imageSrcBase64 = decodeURIComponent(params.src)
  const imageSrc = Buffer.from(imageSrcBase64, 'base64').toString('utf-8')

  const articleID = params.article_id
  const draftKey = searchParams['draftKey']

  const content: contentsAPIResult = await getCMSContent(articleID, draftKey)

  const shareURL = `${getHostname()}/blog/${articleID}/image/${params.src}`
  return (
    <div>
      <ImageArticle
        id={content.id}
        title={`IMAGE: ${content.title}`}
        imageSrc={imageSrc}
        shareURL={shareURL}
        updatedAt={''}
        parsedContents={[]}
        categories={content.categories}
      />
    </div>
  )
}
