import { isPage } from '@/lib/pagenation'
import { pageLimit } from '@/lib/static'
import IllustSamples from './illust_samples'
import { Suspense } from 'react'
import { getAteliers } from '@/lib/api/workers'
import { metadata } from '../layout'
import { rewriteImageURL } from '@/lib/image'
import { getHostname } from '@/lib/env'
import { Metadata } from 'next'
import { ogpImageOption } from '@/lib/static'
import LoadingIllustPage from './loading_illust'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const page = (await searchParams)['p']
  const pageNumber = isPage(page) ? Number(page) : 1
  const offset = (pageNumber - 1) * pageLimit
  const limit = pageLimit
  const ateliers = await getAteliers(offset, limit)
  const firstAtelier = ateliers.ateliers[0]

  const thumbnail = rewriteImageURL(ogpImageOption, firstAtelier.src)

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
  const page = searchParams['p']
  const pageNumber = isPage(page) ? Number(page) : 1
  const offset = (pageNumber - 1) * pageLimit
  const limit = pageLimit

  return (
    <div className="">
      <Suspense fallback={<LoadingIllustPage />}>
        <IllustSamples pageNumber={pageNumber} offset={offset} limit={limit} />
      </Suspense>
    </div>
  )
}
