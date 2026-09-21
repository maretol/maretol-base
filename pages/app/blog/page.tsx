import { permanentRedirect } from 'next/navigation'
import BlogPageArticles from './article'
import { fetchListPage } from '@/lib/api/list_page'
import { getCMSContents } from '@/lib/api/workers'
import { getHrefWithoutPage, parsePaginationParams } from '@/lib/searchParams'
import { generateContentsTotalKey } from 'cms-cache-key-gen'

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
  const { contents, total } = await fetchListPage(generateContentsTotalKey(), pageNumber, limit, () =>
    getCMSContents(offset, limit),
  )

  return <BlogPageArticles contents={contents} total={total} pageNumber={pageNumber} limit={limit} />
}
