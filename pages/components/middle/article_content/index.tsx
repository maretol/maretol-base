import { cn } from '@/lib/utils'
import { maxSampleContentCount } from '@/lib/static'
import { ArticleContentProps } from './types'
import renderContent from './renderContent'

export default async function ArticleContent({
  contents,
  articleID,
  sample,
  draftKey,
  tableOfContents,
}: ArticleContentProps) {
  const sampleFlag = sample || false
  const sampleClassName = 'content-sample line-clamp-6'
  const contentClassName = 'content'
  const className = sampleFlag ? sampleClassName : contentClassName

  return (
    <div className={cn(className, 'px-2 lg:px-6')}>
      {contents.map((content, index) => {
        if (sampleFlag && index > maxSampleContentCount) {
          return null
        }

        const context = {
          articleID,
          index,
          draftKey,
          sample: sampleFlag,
          tableOfContents,
        }

        return renderContent(content, context)
      })}
    </div>
  )
}
