import { metadata } from '@/app/layout'
import { ComicBookPage } from '@/components/large/comics'
import ClientImage from '@/components/small/client_image'
import { getBandeDessineeByID } from '@/lib/api/workers'
import { getHostname } from '@/lib/env'
import { rewriteImageURL } from '@/lib/image'
import { ogpImageOption, originImageOption } from '@/lib/static'
import { BandeDessineeConfig } from 'api-types'
import { Metadata } from 'next'

export const runtime = 'edge'

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const id = (await props.params).id
  const draftKey = (await props.searchParams)['draftKey']
  const data = await getBandeDessineeByID(id, draftKey)
  const contentsUrl = data.contents_url
  const contentsUrlResponse = await fetch(contentsUrl, { next: { revalidate: 60 } })
  const config = (await contentsUrlResponse.json()) as BandeDessineeConfig
  const contentsBaseUrl = contentsUrl.replaceAll('/index.json', '')

  const title = data.title_name
  const coverImageURL = contentsBaseUrl + '/' + config.cover
  const ogpImage = rewriteImageURL(ogpImageOption, coverImageURL)

  return {
    ...metadata,
    title: title + ' | Maretol Base',
    twitter: {
      ...metadata.twitter,
      card: 'summary_large_image',
      title: title + ' | Maretol Base',
      images: [ogpImage],
    },
    openGraph: {
      ...metadata.openGraph,
      title: title + ' | Maretol Base',
      url: `${getHostname()}/comics/${id}`,
      images: [ogpImage],
    },
  } as Metadata
}

export default async function ComicPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const id = (await props.params).id
  const draftKey = (await props.searchParams)['draftKey']
  const data = await getBandeDessineeByID(id, draftKey)
  const contentsUrl = data.contents_url
  const contentsUrlResponse = await fetch(contentsUrl, { next: { revalidate: 60 } })
  const config = (await contentsUrlResponse.json()) as BandeDessineeConfig
  const contentsBaseUrl = contentsUrl.replaceAll('/index.json', '')

  const title = data.title_name
  const firstPage = config.first_page
  const lastPage = config.last_page

  return (
    <div className="p-0 m-0">
      <ComicBookPage
        id={id}
        baseUrl={contentsBaseUrl}
        coverImage={config.cover}
        backCoverImage={config.back_cover}
        firstPageNumber={firstPage}
        lastPageNumber={lastPage}
        firstPageLeftRight={config.first_page_left_right}
        format={config.format}
        filename={config.filename}
        parsedDescription={data.parsed_description}
        next={data.next_id}
        previous={data.previous_id}
      />
    </div>
  )
}
