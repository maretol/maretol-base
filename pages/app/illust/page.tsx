import { isPage } from '@/lib/pagenation'
import { pageLimit } from '@/lib/static'
import IllustSamples from './illust_samples'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

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
      <Suspense fallback={<div>Loading...</div>}>
        <IllustSamples pageNumber={pageNumber} offset={offset} limit={limit} />
      </Suspense>
    </div>
  )
}
