import { notFound } from 'next/navigation'
import { isPageOutOfRange } from '../pagenation'
import { getCachedListTotal, saveListTotal } from './workers'

/**
 * 一覧の1ページ分を取得する。総ページ数を超えるページ番号なら notFound() にする（issue #1283）
 *
 * 2ページ目以降は、KV に持つ総件数で先に範囲を判定する（issue #1291）
 * 0件の結果はキャッシュしないので、この判定がないと範囲外のリクエストが毎回 D1 まで届く
 * 1ページ目は常に範囲内なので、総件数の読み書きをしない
 */
export async function fetchListPage<TResult extends { total: number }>(
  totalKey: string,
  pageNumber: number,
  limit: number,
  fetcher: () => Promise<TResult>,
): Promise<TResult> {
  const cachedTotal = pageNumber > 1 ? await getCachedListTotal(totalKey) : undefined
  if (cachedTotal !== undefined && isPageOutOfRange(pageNumber, cachedTotal, limit)) {
    notFound()
  }

  const result = await fetcher()
  // 取得に失敗すると total は既定値の 0 になる。それを保存すると全ページが範囲外になるので、1件以上のときだけ保存する
  if (pageNumber > 1 && result.total > 0 && result.total !== cachedTotal) {
    await saveListTotal(totalKey, result.total)
  }
  if (isPageOutOfRange(pageNumber, result.total, limit)) {
    notFound()
  }
  return result
}
