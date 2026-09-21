import { notFound, permanentRedirect } from 'next/navigation'
import BlogPageArticles from './article'
import { getCMSContents } from '@/lib/api/workers'
import { isPageOutOfRange } from '@/lib/pagenation'
import { getHrefWithoutPage, parsePaginationParams } from '@/lib/searchParams'

export const dynamic = 'force-dynamic'

export default async function Mainpage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const pagination = parsePaginationParams(searchParams)
  if (pagination === null) {
    permanentRedirect(getHrefWithoutPage('/blog', searchParams))
  }
  const { pageNumber, offset, limit } = pagination

  // 範囲外のページを HTTP ステータスも含めて 404 で返すため、Suspense を挟まずに取得する（issue #1283）
  const { contents, total } = await getCMSContents(offset, limit)
  if (isPageOutOfRange(pageNumber, total, limit)) {
    notFound()
  }

  return <BlogPageArticles contents={contents} total={total} pageNumber={pageNumber} limit={limit} />
}
