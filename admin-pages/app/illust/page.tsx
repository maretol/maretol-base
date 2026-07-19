import Link from 'next/link'
import { listAteliers } from '@/lib/db'
import { formatJST } from '@/lib/format'

export const dynamic = 'force-dynamic'

const statusLabel: Record<string, string> = {
  PUBLISH: '公開',
  DRAFT: '下書き',
  CLOSED: '非公開',
}

export default async function IllustList() {
  const ateliers = await listAteliers()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">イラスト一覧</h1>
        <div className="flex gap-2">
          <Link href="/illust/tags" className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
            タグ管理
          </Link>
          <Link href="/illust/new" className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
            新規作成
          </Link>
        </div>
      </div>

      <table className="w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="p-2">画像</th>
            <th className="p-2">ID</th>
            <th className="p-2">タイトル</th>
            <th className="p-2">タグ</th>
            <th className="p-2">状態</th>
            <th className="p-2">形式</th>
            <th className="p-2">公開日時</th>
            <th className="p-2">更新日時</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {ateliers.map((a) => (
            <tr key={a.id} className="border-b border-gray-100">
              <td className="p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.src} alt="" className="h-10 w-10 rounded object-cover" style={{ objectPosition: a.object_position }} />
              </td>
              <td className="p-2 font-mono text-xs">{a.id}</td>
              <td className="p-2">{a.title}</td>
              <td className="p-2 text-xs">{a.tag_names ?? '-'}</td>
              <td className="p-2">{statusLabel[a.status] ?? a.status}</td>
              <td className="p-2 font-mono text-xs">{a.description_format}</td>
              <td className="p-2 text-xs">{formatJST(a.published_at)}</td>
              <td className="p-2 text-xs">{formatJST(a.updated_at)}</td>
              <td className="p-2">
                <Link href={`/illust/${a.id}/edit`} className="text-blue-600 underline">
                  編集
                </Link>
              </td>
            </tr>
          ))}
          {ateliers.length === 0 && (
            <tr>
              <td colSpan={9} className="p-4 text-center text-gray-400">
                データがありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
