import { listBlogCategories } from '@/lib/db_blog'
import { BlogForm } from '../blog-form'

export const dynamic = 'force-dynamic'

export default async function NewBlogContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; preview?: string }>
}) {
  const { error, preview } = await searchParams
  const allCategories = await listBlogCategories()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ブログ記事新規作成</h1>
      <BlogForm mode="new" allCategories={allCategories} error={error} previewURL={preview} />
    </div>
  )
}
