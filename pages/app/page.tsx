import { getCMSContents } from '@/lib/api/workers'
import { pageLimit } from '@/lib/static'
import { Article } from '@/components/large/article'
import Pagenation from '@/components/middle/pagenation'

export const runtime = 'edge'

export default async function Mainpage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const page = searchParams['p']
  const pageNumber = isPage(page) ? Number(page) : 1
  const offset = (pageNumber - 1) * pageLimit
  const limit = pageLimit

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
          rawContent={''}
          parsedContents={content.parsed_content}
        />
      ))}
      <div className="flex justify-center">
        <Pagenation path="/" currentPage={pageNumber} totalPage={Math.ceil(total / limit)} />
      </div>
    </div>
  )
}

function isPage(page: string | string[] | undefined): boolean {
  if (page === undefined) {
    return false
  }
  if (typeof page === 'string') {
    // page が数字であれば true
    return !isNaN(Number(page))
  }
  return false
}
