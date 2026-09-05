import { ComicOverview } from '@/components/large/comics'
import Pagenation from '@/components/middle/pagenation'
import { Button } from '@/components/ui/button'
import { getBandeDessinee } from '@/lib/api/workers'
import { getFirstPage, getSeriesName } from '@/lib/comic_util'
import { BookImageIcon } from 'lucide-react'
import Link from 'next/link'

export default async function ComicsPageArticles({
  pageNumber,
  offset,
  limit,
  seriesID,
}: {
  pageNumber: number
  offset: number
  limit: number
  seriesID?: string
}) {
  const { bandeDessinees, total } = await getBandeDessinee(offset, limit, seriesID)
  const isSeriesFiltered = seriesID !== undefined
  // シリーズ指定時の見出し用。結果が空のときは名前が引けないのでIDで代替する
  const seriesName = getSeriesName(bandeDessinees) ?? seriesID

  return (
    <div className="flex flex-col justify-center gap-10">
      {isSeriesFiltered && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-xl font-bold">シリーズ : {seriesName}</h2>
          <Button variant="secondary" className="gap-1 font-suse" asChild>
            <Link href="/comics">
              <BookImageIcon className="w-4 h-4" />
              All Comics
            </Link>
          </Button>
        </div>
      )}
      {isSeriesFiltered && total === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500">このシリーズのマンガは見つかりませんでした</p>
        </div>
      ) : (
        bandeDessinees.map((bandeDessinee) => (
          <ComicOverview
            key={bandeDessinee.id}
            id={bandeDessinee.id}
            publishedAt={bandeDessinee.publishedAt}
            updatedAt={bandeDessinee.updatedAt}
            titleName={bandeDessinee.title_name}
            publishDate={bandeDessinee.publish_date ?? null}
            publishEvent={bandeDessinee.publish_event ?? null}
            contentsUrl={bandeDessinee.contents_url}
            seriesId={bandeDessinee.series?.id ?? null}
            seriesName={bandeDessinee.series?.series_name ?? null}
            tagId={bandeDessinee.tag.id}
            tagName={bandeDessinee.tag.tag_name}
            nextId={bandeDessinee.next_id ?? null}
            previousId={bandeDessinee.previous_id ?? null}
            cover={bandeDessinee.cover ?? null}
            firstPage={getFirstPage(bandeDessinee.filename, bandeDessinee.first_page, bandeDessinee.format[0])}
            parsedDescription={bandeDessinee.parsed_description}
            tableOfContents={bandeDessinee.table_of_contents}
          />
        ))
      )}
      <div className="flex justify-center">
        <Pagenation
          path="/comics"
          queryWithoutPage={isSeriesFiltered ? { series: seriesID } : {}}
          currentPage={pageNumber}
          totalPage={Math.ceil(total / limit)}
        />
      </div>
    </div>
  )
}
