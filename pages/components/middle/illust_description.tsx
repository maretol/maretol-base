import { ParsedContent, TableOfContents } from 'api-types'
import ArticleContent from './article_content'

export default async function IllustDescription(props: {
  description: ParsedContent[]
  tableOfContents?: TableOfContents
}) {
  const { description, tableOfContents } = props

  return (
    <div className="px-4 py-2">
      <ArticleContent contents={description} articleID="" sample={false} tableOfContents={tableOfContents} />
    </div>
  )
}
