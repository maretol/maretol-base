import { notFound } from 'next/navigation'
import { getBlogContent, getBlogContentCategoryIDs, listBlogCategories } from '@/lib/db_blog'
import { BlogForm } from '../../blog-form'
import { purgeBlogContentCacheAction } from '../../actions'
import { PurgeCacheButton } from '@/components/purge-cache-button'
import { parsePageParam } from '@/lib/pagination'

export const dynamic = 'force-dynamic'

export default async function EditBlogContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; saved?: string; p?: string | string[] }>
}) {
  const { id } = await params
  const { error, saved, p } = await searchParams
  // 戻り先の一覧ページ番号（不正な値は無視する）
  const listPage = parsePageParam(p) ?? undefined

  const article = await getBlogContent(id)
  if (!article) {
    notFound()
  }
  const [selectedCategoryIDs, allCategories] = await Promise.all([getBlogContentCategoryIDs(id), listBlogCategories()])

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
        error={error}
        saved={saved === '1'}
        listPage={listPage}
      />
    </div>
  )
}
