import { ComicOverview } from '@/components/large/comics'
import Pagenation from '@/components/middle/pagenation'
import { getBandeDessinee } from '@/lib/api/workers'

export default async function ComicsPageArticles({
  pageNumber,
  offset,
  limit,
}: {
  pageNumber: number
  offset: number
  limit: number
}) {
  const { bandeDessinees, total } = await getBandeDessinee(offset, limit)

  return (
    <div className="flex flex-col justify-center gap-10">
      {bandeDessinees.map((bandeDessinee) => (
        <ComicOverview
          key={bandeDessinee.id}
          id={bandeDessinee.id}
          publishedAt={bandeDessinee.publishedAt}
          updatedAt={bandeDessinee.updatedAt}
          titleName={bandeDessinee.title_name}
          publishDate={bandeDessinee.publish_date}
          publishEvent={bandeDessinee.publish_event}
          contentsUrl={bandeDessinee.contents_url}
          nextId={bandeDessinee.next_id}
          previousId={bandeDessinee.previous_id}
          parsedDescription={bandeDessinee.parsed_description}
          tableOfContents={bandeDessinee.table_of_contents}
        />
      ))}
      <div className="flex justify-center">
        <Pagenation path="/comics" currentPage={pageNumber} totalPage={Math.ceil(total / limit)} />
      </div>
    </div>
  )
}
