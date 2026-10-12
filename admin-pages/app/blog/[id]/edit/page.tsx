import { notFound } from 'next/navigation'
import { getBlogContent, getBlogContentCategoryIDs, listBlogCategories } from '@/lib/db_blog'
import type { SaveActionState } from '@/lib/form-state'
import { blogDraft } from '@/lib/draft_blog'
import { BlogForm } from '../../blog-form'
import { purgeBlogContentCacheAction } from '../../actions'
import { PurgeCacheButton } from '@/components/purge-cache-button'

export const dynamic = 'force-dynamic'

export default async function EditBlogContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  // saved / warning / purge_failed は新規作成から遷移してきたときだけ付く（更新の結果はフォームが state で表示する）
  searchParams: Promise<{ saved?: string; warning?: string; purge_failed?: string }>
}) {
  const { id } = await params
  const { saved, warning, purge_failed: purgeFailed } = await searchParams

  const article = await getBlogContent(id)
  if (!article) {
    notFound()
  }
  const [selectedCategoryIDs, allCategories, existingPreview] = await Promise.all([
    getBlogContentCategoryIDs(id),
    listBlogCategories(),
    blogDraft.getExistingPreview(id),
  ])
  const initialState: SaveActionState =
    saved === '1' ? { saved: true, created: true, warning, purgeFailed: purgeFailed === '1' } : {}

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ブログ記事編集: {article.title}</h1>
      <PurgeCacheButton
        action={purgeBlogContentCacheAction}
        contentID={id}
        label="この記事のキャッシュを削除"
        description="一覧キャッシュと記事単体キャッシュを削除します。保存時は自動でパージされるため、表示の不整合時などに使用してください"
      />
      <BlogForm
        mode="edit"
        article={article}
        selectedCategoryIDs={selectedCategoryIDs}
        allCategories={allCategories}
        initialState={initialState}
        existingPreview={existingPreview}
      />
    </div>
  )
}
