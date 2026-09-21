import { getCMSContentsWithTags, getTags } from '@/lib/api/workers'
import { Article } from '@/components/large/article'
import { metadata } from '../layout'
import { getHostname } from '@/lib/env'
import TagSelector from '@/components/middle/tagsearch'
import Pagenation from '@/components/middle/pagenation'
import { notFound, permanentRedirect } from 'next/navigation'
import { fetchListPage } from '@/lib/api/list_page'
import { getHrefWithoutPage, parsePaginationParams, parseTagParams } from '@/lib/searchParams'

export async function generateMetadata(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const { tagID } = parseTagParams(searchParams)

  const tags = await getTags()

  const selectedTag = tags.find((tag) => tag.id === tagID)
  const title = selectedTag ? `タグ検索：${selectedTag.name} | Maretol Base` : 'タグ検索 | Maretol Base'

  // canonical URLの生成
  const canonicalUrlObj = new URL('/tag', getHostname())
  if (tagID) {
    canonicalUrlObj.searchParams.set('tag_id', tagID)
  }
  const canonicalUrl = canonicalUrlObj.toString()

  return {
    title: title,
    description: 'タグ検索ページ',
    robots: tagID ? 'index, follow' : 'noindex, nofollow',
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
  const { tagID, tagName } = parseTagParams(searchParams)
  const pagination = parsePaginationParams(searchParams)
  if (pagination === null) {
    permanentRedirect(getHrefWithoutPage('/tag', searchParams))
  }
  const { pageNumber, offset, limit } = pagination

  // ページネーションのリンクに引き継ぐクエリ。tag_name は検索に使わないが、落とすと使っていないことが URL から分かってしまう
  const queryWithoutPage = {
    ...(tagID ? { tag_id: tagID } : {}),
    ...(tagName ? { tag_name: tagName } : {}),
  }

  // タグの一覧にない tag_id は0件と分かっているので、D1 へ問い合わせない。tag_id は自由に指定できるため（issue #1291）
  // タグの一覧が空のときは取得に失敗しているので、判定せずに問い合わせる
  const tags = await getTags()
  const isKnownTag = !!tagID && (tags.length === 0 || tags.some((tag) => tag.id === tagID))
  if (!isKnownTag && pageNumber > 1) {
    notFound()
  }
  const { contents, total } = isKnownTag
    ? await fetchListPage(pageNumber, limit, () => getCMSContentsWithTags([tagID], offset, limit))
    : { contents: [], total: 0 }

  return (
    <div>
      <div>
        <div className="mb-4">
          <div className="mb-2">
            <h2 className="font-bold alphabet">Selected Tag : </h2>
          </div>
          <TagSelector tags={tags} selectedTagID={tagID} />
        </div>
      </div>
      <div className="flex flex-col justify-center gap-10">
        {!tagID ? (
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
                queryWithoutPage={queryWithoutPage}
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
