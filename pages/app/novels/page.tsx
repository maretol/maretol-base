import BaseLayout from '@/components/large/base_layout'
import { Suspense } from 'react'
import LoadingNovelsPage from './loading_article'
import NovelsPageArticles from './article'
import { parsePaginationParams } from '@/lib/searchParams'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const { pageNumber } = parsePaginationParams(searchParams)

  return {
    title: `Novels : page ${pageNumber} | Maretol Base`,
  }
}

export default async function NovelsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const { pageNumber, offset, limit } = parsePaginationParams(searchParams)

  return (
    <BaseLayout>
      <Suspense fallback={<LoadingNovelsPage />}>
        <NovelsPageArticles pageNumber={pageNumber} offset={offset} limit={limit} />
      </Suspense>
    </BaseLayout>
  )
}
