import BaseLayout from '@/components/large/base_layout'
import { notFound, permanentRedirect } from 'next/navigation'
import ComicsPageArticles from './article'
import { getHrefWithoutPage, parsePaginationParams, parseSeriesParams } from '@/lib/searchParams'
import { getBandeDessinee } from '@/lib/api/workers'
import { getSeriesName } from '@/lib/comic_util'
import { isPageOutOfRange } from '@/lib/pagenation'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const pagination = parsePaginationParams(searchParams)
  // p が不正なときはページ本体が redirect する
  if (pagination === null) {
    return {}
  }
  const { pageNumber, offset, limit } = pagination
  const { seriesID } = parseSeriesParams(searchParams)

  // シリーズ指定時はシリーズ名をタイトルに含める。取得はReact cacheでページ本体と共有される
  let title = `Comics : page ${pageNumber} | Maretol Base`
  if (seriesID !== undefined) {
    const { bandeDessinees } = await getBandeDessinee(offset, limit, seriesID)
    const seriesName = getSeriesName(bandeDessinees)
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
  const pagination = parsePaginationParams(searchParams)
  if (pagination === null) {
    permanentRedirect(getHrefWithoutPage('/comics', searchParams))
  }
  const { pageNumber, offset, limit } = pagination

  // 範囲外のページを HTTP ステータスも含めて 404 で返すため、Suspense を挟まずに取得する（issue #1283）
  const { bandeDessinees, total } = await getBandeDessinee(offset, limit, seriesID)
  if (isPageOutOfRange(pageNumber, total, limit)) {
    notFound()
  }

  return (
    <BaseLayout>
      <ComicsPageArticles
        bandeDessinees={bandeDessinees}
        total={total}
        pageNumber={pageNumber}
        limit={limit}
        seriesID={seriesID}
      />
    </BaseLayout>
  )
}
