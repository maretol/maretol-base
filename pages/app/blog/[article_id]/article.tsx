import { FullArticle } from '@/components/large/article'
import { getCMSContent } from '@/lib/api/workers'
import { isArticleUnlocked } from '@/lib/secret_unlock'
import { contentsAPIResult } from 'api-types'
import SecretGate from './secret_gate'

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

  // 限定公開記事はコード解錠まで本文を出さない（draftKey でのプレビューはバイパス）
  if (content.is_secret && draftKey === undefined && !(await isArticleUnlocked(articleID))) {
    return (
      <div>
        <SecretGate articleID={content.id} title={content.title} />
      </div>
    )
  }

  return (
    <div>
      <FullArticle
        id={content.id}
        title={content.title}
        publishedAt={content.publishedAt}
        updatedAt={content.updatedAt}
        categories={content.categories}
        parsedContents={content.parsed_content}
        tableOfContents={content.table_of_contents}
        draftKey={draftKey}
        type="blog"
        shareURL={url}
        annotations={content.annotations}
      />
    </div>
  )
}
