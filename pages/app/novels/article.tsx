import { NovelOverview } from '@/components/large/novels'
import Pagenation from '@/components/middle/pagenation'
import { getNovel } from '@/lib/api/workers'

export default async function NovelsPageArticles({
  pageNumber,
  offset,
  limit,
}: {
  pageNumber: number
  offset: number
  limit: number
}) {
  const { novels, total } = await getNovel(offset, limit)

  return (
    <div className="flex flex-col justify-center gap-10">
      {novels.map((novel) => (
        <NovelOverview
          key={novel.id}
          id={novel.id}
          publishedAt={novel.publishedAt}
          updatedAt={novel.updatedAt}
          titleName={novel.title_name}
          publishDate={novel.publish_date ?? null}
          publishEvent={novel.publish_event ?? null}
          seriesId={novel.series?.id ?? null}
          seriesName={novel.series?.series_name ?? null}
          tagId={novel.tag?.id ?? ''}
          tagName={novel.tag?.tag_name ?? ''}
          nextId={novel.next_id ?? null}
          previousId={novel.previous_id ?? null}
          cover={novel.cover ?? null}
          parsedDescription={novel.parsed_description}
          tableOfContents={novel.table_of_contents}
        />
      ))}
      <div className="flex justify-center">
        <Pagenation path="/novels" currentPage={pageNumber} totalPage={Math.ceil(total / limit)} />
      </div>
    </div>
  )
}
