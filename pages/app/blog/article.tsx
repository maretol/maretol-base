import { Article } from '@/components/large/article'
import Pagenation from '@/components/middle/pagenation'
import { getCMSContents } from '@/lib/api/workers'

export default async function BlogPageArticles({
  pageNumber,
  offset,
  limit,
}: {
  pageNumber: number
  offset: number
  limit: number
}) {
  const { contents, total } = await getCMSContents(offset, limit)
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
