import { FullArticle } from '@/components/large/article'
import { getCMSContent, getSecretMeta } from '@/lib/api/workers'
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

  // 限定公開記事はコード解錠まで本文を出さない（draftKey の有無に関わらずパスフレーズを要求する）
  // 解錠 Cookie は現在の secret_code に紐付けて検証するため、パスフレーズ変更時は自動的に失効する
  if (content.is_secret) {
    const store = await (await import('next/headers')).cookies()
    if (!store.get(`secret_unlock_${articleID}`)) {
      // 解錠 Cookie がない場合は即座に SecretGate を出す（Cookie の有無で高速に分岐させる）
      return (
        <div>
          <SecretGate articleID={content.id} title={content.title} draftKey={draftKey} />
        </div>
      )
    }
    // 下書きプレビュー時は draftKey を渡さないと未公開記事の secret_code が取得できない
    const meta = await getSecretMeta(articleID, draftKey)
    if (!(await isArticleUnlocked(articleID, meta.secret_code ?? ''))) {
      return (
        <div>
          <SecretGate articleID={content.id} title={content.title} draftKey={draftKey} />
        </div>
      )
    }
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
