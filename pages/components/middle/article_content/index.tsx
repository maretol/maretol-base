import { cn } from '@/lib/utils'
import { ArticleContentProps } from './types'
import { ContentFactory } from './ContentFactory'

// sampleの場合はコンテンツは6つまでの表示
const MAX_SAMPLE_CONTENT_COUNT = 5

export default async function ArticleContent({ contents, articleID, sample, tableOfContents }: ArticleContentProps) {
  const sampleFlag = sample || false
  const sampleClassName = 'content-sample line-clamp-6'
  const contentClassName = 'content'
  const className = sampleFlag ? sampleClassName : contentClassName

  const factory = new ContentFactory()

  return (
    <div className={cn(className)}>
      {contents.map((content, index) => {
        if (sampleFlag && index > MAX_SAMPLE_CONTENT_COUNT) {
          return null
        }

        const context = {
          articleID,
          index,
          sample: sampleFlag,
          tableOfContents,
        }

        return factory.render(content, context)
      })}
    </div>
  )
}
