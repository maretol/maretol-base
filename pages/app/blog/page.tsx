import { Suspense } from 'react'
import LoadingBlogPage from './loading_article'
import BlogPageArticles from './article'
import { parsePaginationParams } from '@/lib/searchParams'

export const dynamic = 'force-dynamic'

export default async function Mainpage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const { pageNumber, offset, limit } = parsePaginationParams(searchParams)

  return (
    <Suspense fallback={<LoadingBlogPage />}>
      <BlogPageArticles pageNumber={pageNumber} offset={offset} limit={limit} />
    </Suspense>
  )
}
