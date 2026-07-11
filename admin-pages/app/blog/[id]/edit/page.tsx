import { notFound } from 'next/navigation'
import { getBlogContent, getBlogContentCategoryIDs, listBlogCategories } from '@/lib/db_blog'
import { BlogForm } from '../../blog-form'

export const dynamic = 'force-dynamic'

export default async function EditBlogContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; preview?: string }>
}) {
  const { id } = await params
  const { error, preview } = await searchParams

  const article = await getBlogContent(id)
  if (!article) {
    notFound()
  }
  const [selectedCategoryIDs, allCategories] = await Promise.all([getBlogContentCategoryIDs(id), listBlogCategories()])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ブログ記事編集: {article.title}</h1>
      <BlogForm
        mode="edit"
        article={article}
        selectedCategoryIDs={selectedCategoryIDs}
        allCategories={allCategories}
        error={error}
        previewURL={preview}
      />
    </div>
  )
}
