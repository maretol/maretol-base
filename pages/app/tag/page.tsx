import { getCMSContentsWithTags, getTags } from '@/lib/api/workers'
import { Article } from '@/components/large/article'
import { metadata } from '../layout'
import { getHostname } from '@/lib/env'
import { pageLimit } from '@/lib/static'
import TagSelector from '@/components/middle/tagsearch'
import Pagenation from '@/components/middle/pagenation'

export async function generateMetadata(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const rawTagIDs = searchParams['tag_id']
  const tagIDs = getTagIDs(rawTagIDs)

  const tags = await getTags()

  const selectedTags = tags.filter((tag) => tagIDs.includes(tag.id))
  const title = `タグ検索：${selectedTags.map((t) => t.name).join(', ')} | Maretol Base`

  // canonical URLの生成
  let canonicalUrl = getHostname() + '/tag'
  if (tagIDs.length > 0) {
    const params = tagIDs.map((id) => `tag_id=${id}`).join('&')
    canonicalUrl += `?${params}`
  }

  return {
    title: title,
    description: 'タグ検索ページ',
    robots: tagIDs.length === 1 ? 'index, follow' : 'noindex, follow',
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      ...metadata.openGraph,
      title: title,
      description: 'タグ検索ページ',
      url: canonicalUrl,
    },
  }
}

export default async function TagPage(props: {
  searchParams: Promise<{ [key: string]: string[] | string | undefined }>
}) {
  const searchParams = await props.searchParams
  const rawTagIDs = searchParams['tag_id']
  const rawTagNames = searchParams['tag_name']
  const page = searchParams['p']

  const tagIDs = getTagIDs(rawTagIDs)
  const tagNames = getTagNames(rawTagNames)
  const pageNumber = getPageNumber(page)

  const offset = (pageNumber - 1) * pageLimit
  const limit = pageLimit

  const tags = await getTags()

  const { contents, total } = await getCMSContentsWithTags(tagIDs, offset, limit)

  return (
    <div>
      <div>
        <div className="mb-4">
          <div className="mb-2">
            <h2 className="font-bold alphabet">Selected Tags (Max 3) : </h2>
          </div>
          <TagSelector tags={tags} tagIDs={tagIDs} tagNames={tagNames} />
        </div>
      </div>
      <div className="flex flex-col justify-center gap-10">
        {tagIDs.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">タグを選択してください</p>
          </div>
        ) : total === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">検索結果が見つかりませんでした</p>
          </div>
        ) : (
          <>
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
              <Pagenation
                path="/tag"
                queryWithoutPage={{ tag_id: tagIDs, tag_name: tagNames }}
                currentPage={pageNumber}
                totalPage={Math.ceil(total / limit)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function getTagIDs(rawTagIDs: string | string[] | undefined): string[] {
  if (rawTagIDs === undefined) {
    return []
  } else if (typeof rawTagIDs === 'string') {
    return [rawTagIDs]
  } else {
    return rawTagIDs.slice(0, 3)
  }
}

function getTagNames(rawTagNames: string | string[] | undefined): string[] {
  if (rawTagNames === undefined) {
    return []
  } else if (typeof rawTagNames === 'string') {
    return [rawTagNames]
  } else {
    return rawTagNames.slice(0, 3)
  }
}

function getPageNumber(page: string | string[] | undefined): number {
  if (page === undefined) {
    return 1
  } else if (typeof page === 'string') {
    return Number(page)
  } else {
    return 1
  }
}
