import { Article } from '@/components/large/article'
import Pagenation from '@/components/middle/pagenation'
import { contentsAPIResult } from 'api-types'

export default function BlogPageArticles({
  contents,
  total,
  pageNumber,
  limit,
}: {
  contents: contentsAPIResult[]
  total: number
  pageNumber: number
  limit: number
}) {
  return (
    <div className="flex flex-col justify-center gap-10">
      {contents.map((content) => (
        <Article
          key={content.id}
          id={content.id}
          title={content.title}
          updatedAt={content.updatedAt}
          categories={content.categories}
          parsedContents={content.parsed_content}
        />
      ))}
      <div className="flex justify-center">
        <Pagenation path="/blog" currentPage={pageNumber} totalPage={Math.ceil(total / limit)} />
      </div>
    </div>
  )
}
