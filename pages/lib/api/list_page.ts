import { notFound } from 'next/navigation'
import { isPageOutOfRange } from '../pagenation'

/**
 * 一覧の1ページ分を取得する。総ページ数を超えるページ番号なら notFound() にする（issue #1283）
 *
 * 範囲外のリクエストを D1 の前で弾く処理は、lib/api/workers.ts の listTotal が受け持つ（issue #1291）
 * その場合 fetcher は「KV の総件数と空の一覧」を返すので、ここでの判定で 404 になる
 */
export async function fetchListPage<TResult extends { total: number }>(
  pageNumber: number,
  limit: number,
  fetcher: () => Promise<TResult>,
): Promise<TResult> {
  const result = await fetcher()
  if (isPageOutOfRange(pageNumber, result.total, limit)) {
    notFound()
  }
  return result
}
