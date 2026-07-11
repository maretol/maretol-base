import Link from 'next/link'
import { listBlogContents } from '@/lib/db_blog'

export const dynamic = 'force-dynamic'

const statusLabel: Record<string, string> = {
  PUBLISH: '公開',
  DRAFT: '下書き',
  CLOSED: '非公開',
}

export default async function BlogList() {
  const articles = await listBlogContents()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ブログ記事一覧</h1>
        <div className="flex gap-2">
          <Link href="/blog/categories" className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
            カテゴリ管理
          </Link>
          <Link href="/blog/info" className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
            固定ページ
          </Link>
          <Link href="/blog/static" className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
            静的文言
          </Link>
          <Link href="/blog/new" className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
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
            <th className="p-2">限定</th>
            <th className="p-2">形式</th>
            <th className="p-2">公開日時</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a) => (
            <tr key={a.id} className="border-b border-gray-100">
              <td className="p-2 font-mono text-xs">{a.id}</td>
              <td className="p-2">{a.title}</td>
              <td className="p-2">{statusLabel[a.status] ?? a.status}</td>
              <td className="p-2">{a.is_secret === 1 ? '🔒' : ''}</td>
              <td className="p-2 font-mono text-xs">{a.content_format}</td>
              <td className="p-2 text-xs">{a.published_at ?? '-'}</td>
              <td className="p-2">
                <Link href={`/blog/${a.id}/edit`} className="text-blue-600 underline">
                  編集
                </Link>
              </td>
            </tr>
          ))}
          {articles.length === 0 && (
            <tr>
              <td colSpan={7} className="p-4 text-center text-gray-400">
                データがありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
