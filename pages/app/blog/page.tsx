import { pageLimit } from '@/lib/static'
import { Suspense } from 'react'
import LoadingBlogPage from './loading_article'
import BlogPageArticles from './article'
import { isPage } from '@/lib/pagenation'

'

export default async function Mainpage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const page = searchParams['p']
  const pageNumber = isPage(page) ? Number(page) : 1
  const offset = (pageNumber - 1) * pageLimit
  const limit = pageLimit

  return (
    <Suspense fallback={<LoadingBlogPage />}>
      <BlogPageArticles pageNumber={pageNumber} offset={offset} limit={limit} />
    </Suspense>
  )
}
