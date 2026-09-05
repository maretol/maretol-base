import BaseLayout from '@/components/large/base_layout'
import { Suspense } from 'react'
import LoadingComicsPage from './loading_article'
import ComicsPageArticles from './article'
import { parsePaginationParams, parseSeriesParams } from '@/lib/searchParams'
import { getBandeDessinee } from '@/lib/api/workers'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const { pageNumber, offset, limit } = parsePaginationParams(searchParams)
  const { seriesID } = parseSeriesParams(searchParams)

  // シリーズ指定時はシリーズ名をタイトルに含める。取得はReact cacheでページ本体と共有される
  let title = `Comics : page ${pageNumber} | Maretol Base`
  if (seriesID !== undefined) {
    const { bandeDessinees } = await getBandeDessinee(offset, limit, seriesID)
    const seriesName = bandeDessinees[0]?.series?.series_name
    if (seriesName) {
      title = `Comics : ${seriesName} : page ${pageNumber} | Maretol Base`
    }
  }

  return {
    title,
  }
}

export default async function ComicsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const { seriesID } = parseSeriesParams(searchParams)
  const { pageNumber, offset, limit } = parsePaginationParams(searchParams)

  return (
    <BaseLayout>
      <Suspense fallback={<LoadingComicsPage />}>
        <ComicsPageArticles pageNumber={pageNumber} offset={offset} limit={limit} seriesID={seriesID} />
      </Suspense>
    </BaseLayout>
  )
}
