import { FullArticle } from '@/components/large/article'
import { getCMSContent } from '@/lib/api/workers'
import { contentsAPIResult } from 'api-types'

export default async function BlogPageArticle({
  articleID,
  draftKey,
  url,
}: {
  articleID: string
  draftKey: string | undefined
  url: string
}) {
  const content: contentsAPIResult = await getCMSContent(articleID, draftKey)
  return (
    <div>
      <FullArticle
        id={content.id}
        title={content.title}
        publishedAt={content.publishedAt}
        updatedAt={content.updatedAt}
        categories={content.categories}
        rawContent={''}
        parsedContents={content.parsed_content}
        type="blog"
        shareURL={url}
      />
    </div>
  )
}
