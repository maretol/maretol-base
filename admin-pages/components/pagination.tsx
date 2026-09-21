import Link from 'next/link'
import { withPage } from '@/lib/pagination'

const linkClass = 'rounded-md border border-gray-300 px-3 py-1 hover:bg-gray-100'
const currentClass = 'rounded-md border border-gray-900 bg-gray-900 px-3 py-1 text-white'
const disabledClass = 'rounded-md border border-gray-200 px-3 py-1 text-gray-300'

export type PaginationProps = {
  path: string
  currentPage: number
  totalPage: number
  total: number
  pageSize: number
}

// 省略表示（…）は公開サイト側の対応に合わせて行うため、現状は全ページ番号を並べる
// 一覧の上下に置くので、2つ目は label で nav を区別する。リンクがページ数×2 になるため prefetch は切る
export function Pagination({
  path,
  currentPage,
  totalPage,
  total,
  pageSize,
  label = 'ページネーション',
}: PaginationProps & { label?: string }) {
  if (total === 0) {
    return null
  }

  const first = (currentPage - 1) * pageSize + 1
  const last = Math.min(currentPage * pageSize, total)
  const pages = Array.from({ length: totalPage }, (_, i) => i + 1)

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p className="text-gray-500">
        全{total}件中 {first}–{last}件
      </p>
      {totalPage > 1 && (
        <nav aria-label={label} className="flex flex-wrap items-center gap-1">
          {currentPage > 1 ? (
            <Link href={withPage(path, currentPage - 1)} prefetch={false} className={linkClass}>
              前へ
            </Link>
          ) : (
            <span className={disabledClass}>前へ</span>
          )}
          {pages.map((page) =>
            page === currentPage ? (
              <span key={page} aria-current="page" className={currentClass}>
                {page}
              </span>
            ) : (
              <Link key={page} href={withPage(path, page)} prefetch={false} className={linkClass}>
                {page}
              </Link>
            )
          )}
          {currentPage < totalPage ? (
            <Link href={withPage(path, currentPage + 1)} prefetch={false} className={linkClass}>
              次へ
            </Link>
          ) : (
            <span className={disabledClass}>次へ</span>
          )}
        </nav>
      )}
    </div>
  )
}
