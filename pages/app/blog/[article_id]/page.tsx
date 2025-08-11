import { metadata } from '@/app/layout'
import { getCMSContent } from '@/lib/api/workers'
import { contentsAPIResult } from 'api-types'
import { getHostname } from '@/lib/env'
import { getOGPImage, rewriteImageURL } from '@/lib/image'
import { ogpImageOption } from '@/lib/static'
import { Metadata } from 'next'
import BlogPageArticle from './article'
import { Suspense } from 'react'
import LoadingBlogPage from './loading_article'

export async function generateMetadata(props: {
  params: Promise<{ article_id: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const searchParams = await props.searchParams
  const params = await props.params
  const articleID = params.article_id
  const draftKey = searchParams['draftKey']

  const content: contentsAPIResult = await getCMSContent(articleID, draftKey)
  const ogpImage = content.ogp_image
  const thumbnail =
    ogpImage === null || ogpImage === undefined ? getOGPImage() : rewriteImageURL(ogpImageOption, ogpImage)
  const description = content.parsed_content
    .slice(0, 5)
    .map((c) => c.text)
    .join(' ')
  const twitterCard = ogpImage === null || ogpImage === undefined ? 'summary' : 'summary_large_image'

  return {
    ...metadata,
    title: content.title + ' | Maretol Base',
    description: content.title,
    twitter: {
      ...metadata.twitter,
      card: twitterCard,
      title: content.title + ' | Maretol Base',
      description: description,
      images: [thumbnail],
    },
    openGraph: {
      ...metadata.openGraph,
      title: content.title + ' | Maretol Base',
      description: description,
      url: `${getHostname()}/blog/${articleID}`,
      images: [thumbnail],
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
  const draftKey = searchParams['draftKey']

  const host = getHostname()
  const path = `/blog/${articleID}`
  const url = `${host}${path}`

  return (
    <Suspense fallback={<LoadingBlogPage />}>
      <BlogPageArticle articleID={articleID} draftKey={draftKey} url={url} />
    </Suspense>
  )
}
