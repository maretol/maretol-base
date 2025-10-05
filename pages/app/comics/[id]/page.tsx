import { metadata } from '@/app/layout'
import { ComicDetailPage } from '@/components/large/comics'
import { LoadingComicBook } from '@/components/large/loading_comics'
import ComicBook from '@/components/middle/comicbook'
import FooterButtons from '@/components/small/footer'
import { getBandeDessineeByID } from '@/lib/api/workers'
import { getHostname } from '@/lib/env'
import { getOGPImageURL } from '@/lib/image'
import { Metadata } from 'next'
import { Suspense } from 'react'
import { parseDraftKey } from '@/lib/searchParams'

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const searchParams = await props.searchParams
  const params = await props.params
  const id = params.id
  const draftKey = parseDraftKey(searchParams)

  const data = await getBandeDessineeByID(id, draftKey)
  const contentsUrl = data.contents_url
  const contentsBaseUrl = contentsUrl.replaceAll('/index.json', '')

  const title = data.title_name
  // TODO: 1ページ目のファイル指定はもっときれいにする
  const ogpImageFile = data.cover || data.filename + '_00' + data.first_page + data.format[0]
  const coverImageURL = contentsBaseUrl + '/' + ogpImageFile
  const ogpImage = getOGPImageURL(coverImageURL)

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
  const params = await props.params
  const searchParams = await props.searchParams
  const id = params.id
  const draftKey = parseDraftKey(searchParams)
  const asyncData = getBandeDessineeByID(id, draftKey)
  const data = await asyncData

  const title = data.title_name
  const firstPage = data.filename + '_00' + data.first_page + data.format[0]

  return (
    <div className="p-0 m-0">
      <Suspense fallback={<LoadingComicBook />}>
        <ComicBook cmsResult={asyncData} />
      </Suspense>
      <div className="flex justify-center w-full">
        <div className="w-full max-w-[1500px]">
          <ComicDetailPage
            id={id}
            titleName={title}
            publishedAt={data.publishedAt}
            updatedAt={data.updatedAt}
            publishDate={data.publish_date ?? null}
            publishEvent={data.publish_event ?? null}
            contentsUrl={data.contents_url}
            nextId={data.next_id ?? null}
            seriesId={data.series?.id ?? null}
            seriesName={data.series?.series_name ?? null}
            tagId={data.tag.id}
            tagName={data.tag.tag_name}
            cover={data.cover ?? null}
            firstPage={firstPage}
            previousId={data.previous_id ?? null}
            parsedDescription={data.parsed_description}
            tableOfContents={data.table_of_contents}
          />
          <div className="my-10">
            <footer className="text-center text-sm text-gray-500">
              <FooterButtons />
              <div>
                © 2024 Maretol
                <br />
                DO NOT REPOST WITHOUT PERMISSION
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}
