import IllustSamples from './illust_samples'
import { Suspense } from 'react'
import { permanentRedirect } from 'next/navigation'
import { getAteliers } from '@/lib/api/workers'
import { metadata } from '../layout'
import { getOGPImageURL } from '@/lib/image'
import { getHostname } from '@/lib/env'
import { Metadata } from 'next'
import ClientIllustPage from './client_page'
import { fetchListPage } from '@/lib/api/list_page'
import { getHrefWithoutPage, parsePaginationParams } from '@/lib/searchParams'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const pagination = parsePaginationParams(params)
  // p が不正なときはページ本体が redirect する
  if (pagination === null) {
    return {}
  }
  const { pageNumber, offset, limit } = pagination
  const ateliers = await fetchListPage(pageNumber, limit, () => getAteliers(offset, limit))
  const firstAtelier = ateliers.ateliers.at(0)
  // 0件のときはサムネイルを引けない
  if (firstAtelier === undefined) {
    return {}
  }

  const thumbnail = getOGPImageURL(firstAtelier.src)

  return {
    ...metadata,
    title: `Illustrations | Maretol Base`,
    description: `A collection of illustrations by Maretol: page_${pageNumber}`,
    twitter: {
      ...metadata.twitter,
      title: `Illustrations | Maretol Base`,
      description: `A collection of illustrations by Maretol: page_${pageNumber}`,
      card: 'summary_large_image',
      images: [thumbnail],
    },
    openGraph: {
      ...metadata.openGraph,
      title: `Illustrations | Maretol Base`,
      description: `A collection of illustrations by Maretol: page_${pageNumber}`,
      url: pageNumber !== 1 ? `${getHostname()}/illust/?p=${pageNumber}` : `${getHostname()}/illust/`,
      images: [thumbnail],
    },
  } as Metadata
}

export default async function IllustPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const pagination = parsePaginationParams(searchParams)
  if (pagination === null) {
    permanentRedirect(getHrefWithoutPage('/illust', searchParams))
  }
  const { pageNumber, offset, limit } = pagination

  // 範囲外のページを HTTP ステータスも含めて 404 で返すため、Suspense を挟まずに取得する（issue #1283）
  const { ateliers, total } = await fetchListPage(pageNumber, limit, () => getAteliers(offset, limit))

  return (
    <div className="">
      <IllustSamples ateliers={ateliers} total={total} pageNumber={pageNumber} limit={limit} />
      <Suspense fallback={null}>
        <ClientIllustPage />
      </Suspense>
    </div>
  )
}
