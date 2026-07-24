import { listNovelTags } from '@/lib/db_novel'
import { createNovelTagAction } from '../actions'
import { SubmitButton } from '@/components/submit-button'

export const dynamic = 'force-dynamic'

export default async function NovelTags({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const tags = await listNovelTags()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">小説タグ管理</h1>

      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <table className="w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="p-2">ID</th>
            <th className="p-2">タグ名</th>
          </tr>
        </thead>
        <tbody>
          {tags.map((t) => (
            <tr key={t.id} className="border-b border-gray-100">
              <td className="p-2 font-mono text-xs">{t.id}</td>
              <td className="p-2">{t.tag_name}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <form action={createNovelTagAction} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="font-bold">タグ追加</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm">ID（空欄でランダム生成）</label>
            <input name="id" className="mt-1 w-full rounded-md border border-gray-300 p-2 font-mono text-sm" />
          </div>
          <div>
            <label className="block text-sm">タグ名 *</label>
            <input name="tag_name" required className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm" />
          </div>
        </div>
        <SubmitButton pendingText="追加中...">追加</SubmitButton>
      </form>
    </div>
  )
}
