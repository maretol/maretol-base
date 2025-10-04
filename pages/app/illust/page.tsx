import IllustSamples from './illust_samples'
import { Suspense } from 'react'
import { getAteliers } from '@/lib/api/workers'
import { metadata } from '../layout'
import { getOGPImageURL } from '@/lib/image'
import { getHostname } from '@/lib/env'
import { Metadata } from 'next'
import LoadingIllustPage from './loading_illust'
import ClientIllustPage from './client_page'
import { parsePaginationParams } from '@/lib/searchParams'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const { pageNumber, offset, limit } = parsePaginationParams(params)
  const ateliers = await getAteliers(offset, limit)
  const firstAtelier = ateliers.ateliers[0]

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
  const { pageNumber, offset, limit } = parsePaginationParams(searchParams)

  return (
    <div className="">
      <Suspense fallback={<LoadingIllustPage />}>
        <IllustSamples pageNumber={pageNumber} offset={offset} limit={limit} />
      </Suspense>
      <Suspense fallback={null}>
        <ClientIllustPage />
      </Suspense>
    </div>
  )
}
