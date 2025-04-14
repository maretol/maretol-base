import { pageLimit } from '@/lib/static'
import MainPageArticles from './article'
import { Suspense } from 'react'
import LoadingMainPage from './loading_article'
import BaseLayout from '@/components/large/base_layout'

export default async function Mainpage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const page = searchParams['p']
  const pageNumber = isPage(page) ? Number(page) : 1
  const offset = (pageNumber - 1) * pageLimit
  const limit = pageLimit

  return (
    <BaseLayout>
      <Suspense fallback={<LoadingMainPage />}>
        <MainPageArticles pageNumber={pageNumber} offset={offset} limit={limit} />
      </Suspense>
    </BaseLayout>
  )
}

function isPage(page: string | string[] | undefined): boolean {
  if (page === undefined) {
    return false
  }
  if (typeof page === 'string') {
    // page が数字であれば true
    return !isNaN(Number(page))
  }
  return false
}
