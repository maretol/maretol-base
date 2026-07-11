import { listTags } from '@/lib/db'
import { createTagAction } from '../actions'

export const dynamic = 'force-dynamic'

export default async function IllustTags({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const tags = await listTags()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">イラストタグ管理</h1>

      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <table className="w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="p-2">ID</th>
            <th className="p-2">タグ名</th>
            <th className="p-2">種別</th>
          </tr>
        </thead>
        <tbody>
          {tags.map((t) => (
            <tr key={t.id} className="border-b border-gray-100">
              <td className="p-2 font-mono text-xs">{t.id}</td>
              <td className="p-2">{t.tag}</td>
              <td className="p-2">{t.type}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <form action={createTagAction} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="font-bold">タグ追加</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-sm">ID（空欄でランダム生成）</label>
            <input name="id" className="mt-1 w-full rounded-md border border-gray-300 p-2 font-mono text-sm" />
          </div>
          <div>
            <label className="block text-sm">タグ名 *</label>
            <input name="tag" required className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm">種別 *</label>
            <input
              name="type"
              required
              list="tag-types"
              placeholder="作品 / キャラクター など"
              className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm"
            />
            <datalist id="tag-types">
              <option value="作品" />
              <option value="キャラクター" />
            </datalist>
          </div>
        </div>
        <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
          追加
        </button>
      </form>
    </div>
  )
}
