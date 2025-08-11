import { IllustSampleArticle } from '@/components/large/illust_article'
import Pagenation from '@/components/middle/pagenation'
import { getAteliers } from '@/lib/api/workers'

export default async function IllustSamples({
  pageNumber,
  offset,
  limit,
}: {
  pageNumber: number
  offset: number
  limit: number
}) {
  const { ateliers, total } = await getAteliers(offset, limit)
  return (
    <div className="flex flex-col justify-center gap-24">
      {ateliers.map((atelier) => (
        <div key={atelier.id} className="w-full h-auto flex items-center justify-center">
          <IllustSampleArticle
            id={atelier.id}
            title={atelier.title}
            imageSrc={atelier.src}
            objectPosition={atelier.object_position}
            tags={atelier.tag_or_category}
            publishedAt={atelier.publishedAt}
          />
        </div>
      ))}
      <div className="flex justify-center">
        <Pagenation path="/illust" currentPage={pageNumber} totalPage={Math.ceil(total / limit)} />
      </div>
    </div>
  )
}
