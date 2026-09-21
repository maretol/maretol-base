import Link from 'next/link'
import { redirect } from 'next/navigation'
import { listBandeDessinees } from '@/lib/db_comic'
import { PAGE_SIZE, parsePageParam, withPage } from '@/lib/pagination'
import { Pagination } from '@/components/pagination'
import { formatJST, formatJSTDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

const statusLabel: Record<string, string> = {
  PUBLISH: '公開',
  DRAFT: '下書き',
  CLOSED: '非公開',
}

export default async function ComicList({ searchParams }: { searchParams: Promise<{ p?: string | string[] }> }) {
  const page = parsePageParam((await searchParams).p)
  if (page === null) {
    redirect('/comic')
  }

  const { items: comics, total } = await listBandeDessinees({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
  const totalPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
  // 範囲外のページ指定は最終ページへ寄せる
  if (page > totalPage) {
    redirect(withPage('/comic', totalPage))
  }

  const pagination = (
    <Pagination path="/comic" currentPage={page} totalPage={totalPage} total={total} pageSize={PAGE_SIZE} />
  )

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

      {pagination}

      <table className="w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="p-2">ID</th>
            <th className="p-2">タイトル</th>
            <th className="p-2">タグ</th>
            <th className="p-2">シリーズ</th>
            <th className="p-2">発行日</th>
            <th className="p-2">状態</th>
            <th className="p-2">形式</th>
            <th className="p-2">公開日時</th>
            <th className="p-2">更新日時</th>
          </tr>
        </thead>
        <tbody>
          {comics.map((c) => (
            <tr key={c.id} className="border-b border-gray-100">
              <td className="p-2 font-mono text-xs">{c.id}</td>
              <td className="p-2">
                <Link href={withPage(`/comic/${c.id}/edit`, page)} className="text-blue-600 underline">
                  {c.title_name}
                </Link>
              </td>
              <td className="p-2 text-xs">{c.tag_name ?? '-'}</td>
              <td className="p-2 text-xs">{c.series_name ?? '-'}</td>
              <td className="p-2 text-xs">{formatJSTDate(c.publish_date)}</td>
              <td className="p-2">{statusLabel[c.status] ?? c.status}</td>
              <td className="p-2 font-mono text-xs">{c.description_format}</td>
              <td className="p-2 text-xs">{formatJST(c.published_at)}</td>
              <td className="p-2 text-xs">{formatJST(c.updated_at)}</td>
            </tr>
          ))}
          {comics.length === 0 && (
            <tr>
              <td colSpan={10} className="p-4 text-center text-gray-400">
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
