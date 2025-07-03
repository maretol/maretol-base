import BaseLayout from '@/components/large/base_layout'
import { Suspense } from 'react'
import LoadingComicsPage from './loading_article'
import ComicsPageArticles from './article'
import { isPage } from '@/lib/pagenation'
import { pageLimit } from '@/lib/static'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const page = searchParams['p']
  const pageNumber = isPage(page) ? Number(page) : 1

  return {
    title: `Comics : page ${pageNumber} | Maretol Base`,
  }
}

export default async function ComicsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const page = searchParams['p']
  // const seriesId = searchParams['series']
  const pageNumber = isPage(page) ? Number(page) : 1
  const offset = (pageNumber - 1) * pageLimit
  const limit = pageLimit

  return (
    <BaseLayout>
      <Suspense fallback={<LoadingComicsPage />}>
        <ComicsPageArticles pageNumber={pageNumber} offset={offset} limit={limit} />
      </Suspense>
    </BaseLayout>
  )
}
