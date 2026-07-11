import Link from 'next/link'
import { listBandeDessinees } from '@/lib/db_comic'

export const dynamic = 'force-dynamic'

const statusLabel: Record<string, string> = {
  PUBLISH: '公開',
  DRAFT: '下書き',
  CLOSED: '非公開',
}

export default async function ComicList() {
  const comics = await listBandeDessinees()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">マンガ一覧</h1>
        <div className="flex gap-2">
          <Link href="/comic/tags" className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
            タグ管理
          </Link>
          <Link href="/comic/series" className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
            シリーズ管理
          </Link>
          <Link href="/comic/new" className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
            新規作成
          </Link>
        </div>
      </div>

      <table className="w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="p-2">ID</th>
            <th className="p-2">タイトル</th>
            <th className="p-2">状態</th>
            <th className="p-2">形式</th>
            <th className="p-2">公開日時</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {comics.map((c) => (
            <tr key={c.id} className="border-b border-gray-100">
              <td className="p-2 font-mono text-xs">{c.id}</td>
              <td className="p-2">{c.title_name}</td>
              <td className="p-2">{statusLabel[c.status] ?? c.status}</td>
              <td className="p-2 font-mono text-xs">{c.description_format}</td>
              <td className="p-2 text-xs">{c.published_at ?? '-'}</td>
              <td className="p-2">
                <Link href={`/comic/${c.id}/edit`} className="text-blue-600 underline">
                  編集
                </Link>
              </td>
            </tr>
          ))}
          {comics.length === 0 && (
            <tr>
              <td colSpan={6} className="p-4 text-center text-gray-400">
                データがありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
