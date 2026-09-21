import Link from 'next/link'
import { redirect } from 'next/navigation'
import { listBlogContents } from '@/lib/db_blog'
import { PAGE_SIZE, parsePageParam, withPage } from '@/lib/pagination'
import { Pagination } from '@/components/pagination'
import { formatJST } from '@/lib/format'

export const dynamic = 'force-dynamic'

const statusLabel: Record<string, string> = {
  PUBLISH: '公開',
  DRAFT: '下書き',
  CLOSED: '非公開',
}

export default async function BlogList({ searchParams }: { searchParams: Promise<{ p?: string | string[] }> }) {
  const page = parsePageParam((await searchParams).p)
  if (page === null) {
    redirect('/blog')
  }

  const { items: articles, total } = await listBlogContents({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
  const totalPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
  // 範囲外のページ指定は最終ページへ寄せる
  if (page > totalPage) {
    redirect(withPage('/blog', totalPage))
  }

  const pagination = (
    <Pagination path="/blog" currentPage={page} totalPage={totalPage} total={total} pageSize={PAGE_SIZE} />
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ブログ記事一覧</h1>
        <div className="flex gap-2">
          <Link
            href="/blog/categories"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
          >
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

      {pagination}

      <table className="w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="p-2">ID</th>
            <th className="p-2">タイトル</th>
            <th className="p-2">カテゴリ</th>
            <th className="p-2">状態</th>
            <th className="p-2">限定</th>
            <th className="p-2">形式</th>
            <th className="p-2">公開日時</th>
            <th className="p-2">更新日時</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a) => (
            <tr key={a.id} className="border-b border-gray-100">
              <td className="p-2 font-mono text-xs">{a.id}</td>
              <td className="p-2">
                <Link href={withPage(`/blog/${a.id}/edit`, page)} className="text-blue-600 underline">
                  {a.title}
                </Link>
              </td>
              <td className="p-2 text-xs">{a.category_names ?? '-'}</td>
              <td className="p-2">{statusLabel[a.status] ?? a.status}</td>
              <td className="p-2">{a.is_secret === 1 ? '🔒' : ''}</td>
              <td className="p-2 font-mono text-xs">{a.content_format}</td>
              <td className="p-2 text-xs">{formatJST(a.published_at)}</td>
              <td className="p-2 text-xs">{formatJST(a.updated_at)}</td>
            </tr>
          ))}
          {articles.length === 0 && (
            <tr>
              <td colSpan={9} className="p-4 text-center text-gray-400">
                データがありません
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {pagination}
    </div>
  )
}
