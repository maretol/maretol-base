import { metadata } from '@/app/layout'
import { getCMSContent } from '@/lib/api/workers'
import { contentsAPIResult } from 'api-types'
import { getHostname } from '@/lib/env'
import { getDefaultOGPImageURL, getOGPImageURL } from '@/lib/image'
import { Metadata } from 'next'
import BlogPageArticle from './article'
import { Suspense } from 'react'
import LoadingBlogPage from './loading_article'
import { parseDraftKey } from '@/lib/searchParams'

export async function generateMetadata(props: {
  params: Promise<{ article_id: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const searchParams = await props.searchParams
  const params = await props.params
  const articleID = params.article_id
  const draftKey = parseDraftKey(searchParams)

  const content: contentsAPIResult = await getCMSContent(articleID, draftKey)

  // 限定公開記事は本文をメタに出さず、検索インデックスも避ける（draftKey ではバイパスさせない）
  const isSecretLocked = content.is_secret === true

  const ogpImage = content.ogp_image
  const ogpSrc =
    isSecretLocked || ogpImage === null || ogpImage === undefined ? getDefaultOGPImageURL() : ogpImage
  const ogpURL = getOGPImageURL(ogpSrc)
  const description = isSecretLocked
    ? '限定公開記事です'
    : content.parsed_content
        .slice(0, 5)
        .map((c) => c.text)
        .join(' ')
  const twitterCard = isSecretLocked || ogpImage === null || ogpImage === undefined ? 'summary' : 'summary_large_image'

  return {
    ...metadata,
    title: content.title + ' | Maretol Base',
    description: content.title,
    robots: isSecretLocked ? { index: false, follow: false } : undefined,
    twitter: {
      ...metadata.twitter,
      card: twitterCard,
      title: content.title + ' | Maretol Base',
      description: description,
      images: [ogpURL],
    },
    openGraph: {
      ...metadata.openGraph,
      title: content.title + ' | Maretol Base',
      description: description,
      url: `${getHostname()}/blog/${articleID}`,
      images: [ogpURL],
    },
  } as Metadata
}

export default async function BlogArticlePage(props: {
  params: Promise<{ article_id: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const searchParams = await props.searchParams
  const params = await props.params
  const articleID = params.article_id
  const draftKey = parseDraftKey(searchParams)

  const host = getHostname()
  const path = `/blog/${articleID}`
  const url = `${host}${path}`

  return (
    <Suspense fallback={<LoadingBlogPage />}>
      <BlogPageArticle articleID={articleID} draftKey={draftKey} url={url} />
    </Suspense>
  )
}
