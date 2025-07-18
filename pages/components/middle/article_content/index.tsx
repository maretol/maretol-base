import { cn } from '@/lib/utils'
import { ArticleContentProps } from './types'
import { ContentFactory } from './ContentFactory'

export default async function ArticleContent({ contents, articleID, sample, tableOfContents }: ArticleContentProps) {
  const sampleFlag = sample || false
  const sampleClassName = 'content-sample line-clamp-6'
  const contentClassName = 'content'
  const className = sampleFlag ? sampleClassName : contentClassName

  const factory = new ContentFactory()

  return (
    <div className={cn(className)}>
      {contents.map((content, index) => {
        // sampleの場合はコンテンツは6つまででいい
        if (sampleFlag && index > 5) {
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
