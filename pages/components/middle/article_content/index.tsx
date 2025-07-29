import { cn } from '@/lib/utils'
import { ArticleContentProps } from './types'
import renderContent from './renderContent'

// sampleの場合はコンテンツは6つまでの表示
const MAX_SAMPLE_CONTENT_COUNT = 5

export default async function ArticleContent({ contents, articleID, sample, tableOfContents }: ArticleContentProps) {
  const sampleFlag = sample || false
  const sampleClassName = 'content-sample line-clamp-6'
  const contentClassName = 'content'
  const className = sampleFlag ? sampleClassName : contentClassName

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

        return renderContent(content, context)
      })}
    </div>
  )
}
