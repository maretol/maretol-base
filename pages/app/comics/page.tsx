import BaseLayout from '@/components/large/base_layout'
import { Suspense } from 'react'
import LoadingComicsPage from './loading_article'
import ComicsPageArticles from './article'
import { parsePaginationParams } from '@/lib/searchParams'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const { pageNumber } = parsePaginationParams(searchParams)

  return {
    title: `Comics : page ${pageNumber} | Maretol Base`,
  }
}

export default async function ComicsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  // const seriesId = searchParams['series']
  const { pageNumber, offset, limit } = parsePaginationParams(searchParams)

  return (
    <BaseLayout>
      <Suspense fallback={<LoadingComicsPage />}>
        <ComicsPageArticles pageNumber={pageNumber} offset={offset} limit={limit} />
      </Suspense>
    </BaseLayout>
  )
}
