/**
 * ページネーション付き一覧ページ（server component）の共通処理
 */
import { redirect } from 'next/navigation'
import type { PaginationProps } from '@/components/pagination'
import type { PageRange, Paginated } from './db_pagination'
import { PAGE_SIZE, parsePageParam, withPage } from './pagination'

// `p` を検証して該当ページを取得する。不正値はパラメータなしの一覧へ、範囲外は最終ページへ redirect する
export async function loadListPage<T>(
  path: string,
  searchParams: Promise<{ p?: string | string[] }>,
  list: (page: PageRange) => Promise<Paginated<T>>
): Promise<{ items: T[]; pagination: PaginationProps }> {
  const page = parsePageParam((await searchParams).p)
  if (page === null) {
    redirect(path)
  }

  const { items, total } = await list({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
  const totalPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (page > totalPage) {
    redirect(withPage(path, totalPage))
  }

  return { items, pagination: { path, currentPage: page, totalPage, total, pageSize: PAGE_SIZE } }
}
