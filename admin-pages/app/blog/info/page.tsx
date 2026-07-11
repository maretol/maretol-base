import Link from 'next/link'
import { listBlogInfo } from '@/lib/db_blog'

export const dynamic = 'force-dynamic'

const statusLabel: Record<string, string> = {
  PUBLISH: '公開',
  DRAFT: '下書き',
  CLOSED: '非公開',
}

export default async function BlogInfoList() {
  const infoList = await listBlogInfo()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">固定ページ一覧</h1>
        <Link href="/blog/info/new" className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
          新規作成
        </Link>
      </div>

      <table className="w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="p-2">ID</th>
            <th className="p-2">パス</th>
            <th className="p-2">タイトル</th>
            <th className="p-2">状態</th>
            <th className="p-2">形式</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {infoList.map((i) => (
            <tr key={i.id} className="border-b border-gray-100">
              <td className="p-2 font-mono text-xs">{i.id}</td>
              <td className="p-2 font-mono text-xs">{i.page_pathname}</td>
              <td className="p-2">{i.title ?? '-'}</td>
              <td className="p-2">{statusLabel[i.status] ?? i.status}</td>
              <td className="p-2 font-mono text-xs">{i.main_text_format}</td>
              <td className="p-2">
                <Link href={`/blog/info/${i.id}/edit`} className="text-blue-600 underline">
                  編集
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
