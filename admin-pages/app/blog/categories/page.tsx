import { listBlogCategories } from '@/lib/db_blog'
import { createBlogCategoryAction } from '../actions'
import { CategoryOrderList } from './category-order-list'

export const dynamic = 'force-dynamic'

export default async function BlogCategories({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const categories = await listBlogCategories()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ブログカテゴリ管理</h1>

      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <CategoryOrderList categories={categories} />

      <form action={createBlogCategoryAction} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="font-bold">カテゴリ追加（末尾に追加されます）</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm">ID（空欄でランダム生成）</label>
            <input name="id" className="mt-1 w-full rounded-md border border-gray-300 p-2 font-mono text-sm" />
          </div>
          <div>
            <label className="block text-sm">カテゴリ名 *</label>
            <input name="name" required className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm" />
          </div>
        </div>
        <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
          追加
        </button>
      </form>
    </div>
  )
}
