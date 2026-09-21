import { IllustSampleArticle } from '@/components/large/illust_article'
import Pagenation from '@/components/middle/pagenation'
import { atelierResult } from 'api-types'

export default function IllustSamples({
  ateliers,
  total,
  pageNumber,
  limit,
}: {
  ateliers: atelierResult[]
  total: number
  pageNumber: number
  limit: number
}) {
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
