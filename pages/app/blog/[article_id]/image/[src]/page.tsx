// パラレルルート・セマンティクスルート機能で、画像のURLに直接アクセスした場合は画像ページが表示される

import { getCMSContent } from '@/lib/api/workers'
import { contentsAPIResult } from 'api-types'
import { getDefaultOGPImageURL, getOGPImageURL } from '@/lib/image'
import { metadata } from '@/app/layout'
import { Metadata } from 'next'
import { getHostname } from '@/lib/env'
import { Suspense } from 'react'
import ImageRedirectPage from './client_page'

// metadata定義
export async function generateMetadata(props: {
  params: Promise<{ article_id: string; src: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const searchParams = await props.searchParams
  const params = await props.params
  const articleID = params.article_id
  const draftKey = searchParams['draftKey']

  const content: contentsAPIResult = await getCMSContent(articleID, draftKey)

  // 限定公開記事（未解錠）は本文をメタに出さず、検索インデックスも避ける（page.tsx と同様）
  const isSecretLocked = content.is_secret === true && draftKey === undefined

  const ogpImage = content.ogp_image
  const ogpURL = getOGPImageURL(isSecretLocked || !ogpImage ? getDefaultOGPImageURL() : ogpImage)
  const description = isSecretLocked
    ? '限定公開記事です'
    : content.parsed_content
        .slice(0, 5)
        .map((c) => c.text)
        .join(' ')
  const twitterCard = isSecretLocked || ogpImage === null || ogpImage === undefined ? 'summary' : 'summary_large_image'

  return {
    ...metadata,
    title: `IMAGE: ${content.title} | Maretol Base`,
    description: content.title,
    robots: isSecretLocked ? { index: false, follow: false } : undefined,
    twitter: {
      ...metadata.twitter,
      card: twitterCard,
      title: `IMAGE: ${content.title} | Maretol Base`,
      description: description,
      images: [ogpURL],
    },
    openGraph: {
      ...metadata.openGraph,
      title: `IMAGE: ${content.title} | Maretol Base`,
      description: description,
      url: `${getHostname()}/blog/${articleID}`,
      images: [ogpURL],
    },
  } as Metadata
}

export default async function ImagePage(props: {
  params: Promise<{ article_id: string; src: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await props.params

  const imageSrcBase64 = params.src
  const articleID = params.article_id

  return (
    <div>
      <Suspense fallback={null}>
        <ImageRedirectPage articleID={articleID} imageSrcBase64={imageSrcBase64} />
      </Suspense>
    </div>
  )
}
