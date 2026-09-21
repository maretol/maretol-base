type PageItem = number | 'ellipsis-start' | 'ellipsis-end'

// 省略せずに並べられる最大の項目数（1 + 省略 + 前後 + 現在 + 省略 + 最後）
function getPageSlots(siblingCount: number): number {
  return siblingCount * 2 + 5
}

/**
 * ページネーションに表示する項目を返す（issue #1280）
 * 最初と最後のページは常に表示し、現在のページの前後 siblingCount 件以外は省略記号にまとめる
 * - 総ページ数が枠数（siblingCount * 2 + 5）以下なら省略しない
 * - 端に近いときは反対側を広げ、項目数を一定に保つ（ページを移動してもボタンの位置がずれない）
 * - 省略されるのが1ページだけのときは、省略記号ではなくそのページを表示する
 * totalPage は呼び出し側で件数から算出した有限の整数を前提とする（NaN などは考慮しない）
 */
function getPageItems(currentPage: number, totalPage: number, siblingCount: number): PageItem[] {
  if (totalPage < 1) {
    return []
  }
  const slots = getPageSlots(siblingCount)
  if (totalPage <= slots) {
    return Array.from({ length: totalPage }, (_, i) => i + 1)
  }

  // 小数や範囲外のページ番号でも表示が崩れないように丸める
  const current = Math.min(Math.max(Math.trunc(currentPage), 1), totalPage)
  // 中央に並べる範囲。端に近いときは幅を保ったまま内側に寄せる
  const start = Math.max(Math.min(current - siblingCount, totalPage - siblingCount * 2 - 2), 3)
  const end = Math.min(Math.max(current + siblingCount, siblingCount * 2 + 3), totalPage - 2)

  const items: PageItem[] = [1]
  items.push(start > 3 ? 'ellipsis-start' : 2)
  for (let page = start; page <= end; page++) {
    items.push(page)
  }
  items.push(end < totalPage - 2 ? 'ellipsis-end' : totalPage - 1)
  items.push(totalPage)
  return items
}

/**
 * 一覧ページの URL を返す。1ページ目は p を省略する（issue #1283）
 */
function getPageHref(path: string, queryWithoutPage: { [key: string]: string }, page: number): string {
  const params = new URLSearchParams(queryWithoutPage)
  if (page > 1) {
    params.set('p', page.toString())
  }
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

/**
 * 総ページ数。0件のときも1ページとし、空の一覧として表示する
 */
function getTotalPage(total: number, limit: number): number {
  return Math.max(Math.ceil(total / limit), 1)
}

/**
 * 総ページ数を超えるページ番号かどうか（issue #1283）
 */
function isPageOutOfRange(pageNumber: number, total: number, limit: number): boolean {
  return pageNumber > getTotalPage(total, limit)
}

export { getPageItems, getPageSlots, getPageHref, getTotalPage, isPageOutOfRange }
export type { PageItem }
