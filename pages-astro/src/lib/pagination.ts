// 一覧ページのページ番号（クエリの p）の扱いと、ページネーションに表示する項目の計算

// 1 ページあたりの表示数
export const PAGE_LIMIT = 10

// ページ番号として受け付ける形式。桁あふれを避けるため 9 桁までにする
const PAGE_PATTERN = /^[1-9]\d{0,8}$/

export type PageItem = number | 'ellipsis-start' | 'ellipsis-end'

// クエリの p をページ番号にする。p が無ければ 1 ページ目。
// 次の場合は null を返すので、呼び出し側で p を外した URL（getHrefWithoutPage）へリダイレクトする
// - 正の整数以外（小数、0、負数、`1e1` のような別表記、空文字、複数指定など）
// - `p=1`（1 ページ目は p を省略した URL に統一する）
export function parsePageParam(searchParams: URLSearchParams): number | null {
  const values = searchParams.getAll('p')
  if (values.length === 0) {
    return 1
  }
  const [page] = values
  if (values.length > 1 || !PAGE_PATTERN.test(page) || page === '1') {
    return null
  }
  return Number(page)
}

// クエリから p だけを取り除いた URL。p が不正なときのリダイレクト先に使う。
// p 以外は値も順序もそのまま引き継ぐ（`draftKey` や計測用のパラメータなどを落とさないため）
export function getHrefWithoutPage(path: string, searchParams: URLSearchParams): string {
  const params = new URLSearchParams([...searchParams].filter(([key]) => key !== 'p'))
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

// 一覧ページの URL。1 ページ目は p を省略する
export function getPageHref(path: string, queryWithoutPage: Record<string, string>, page: number): string {
  const params = new URLSearchParams(queryWithoutPage)
  if (page > 1) {
    params.set('p', page.toString())
  }
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

// 総ページ数。0 件のときも 1 ページとし、空の一覧として表示する
export function getTotalPage(total: number, limit: number): number {
  return Math.max(Math.ceil(total / limit), 1)
}

// 総ページ数を超えるページ番号かどうか
export function isPageOutOfRange(pageNumber: number, total: number, limit: number): boolean {
  return pageNumber > getTotalPage(total, limit)
}

// 省略せずに並べられる最大の項目数（1 + 省略 + 前後 + 現在 + 省略 + 最後）
export function getPageSlots(siblingCount: number): number {
  return siblingCount * 2 + 5
}

// ページネーションに表示する項目。
// 最初と最後のページは常に表示し、現在のページの前後 siblingCount 件以外は省略記号にまとめる
// - 総ページ数が枠数（siblingCount * 2 + 5）以下なら省略しない
// - 端に近いときは反対側を広げ、項目数を一定に保つ（ページを移動してもボタンの位置がずれない）
// - 省略されるのが 1 ページだけのときは、省略記号ではなくそのページを表示する
export function getPageItems(currentPage: number, totalPage: number, siblingCount: number): PageItem[] {
  if (totalPage < 1) {
    return []
  }
  if (totalPage <= getPageSlots(siblingCount)) {
    return Array.from({ length: totalPage }, (_, i) => i + 1)
  }

  // 小数や範囲外のページ番号でも表示が崩れないように丸める
  const current = Math.min(Math.max(Math.trunc(currentPage), 1), totalPage)
  // 中央に並べる範囲。端に近いときは幅を保ったまま内側に寄せる
  const start = Math.max(Math.min(current - siblingCount, totalPage - siblingCount * 2 - 2), 3)
  const end = Math.min(Math.max(current + siblingCount, siblingCount * 2 + 3), totalPage - 2)
  const middle = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  return [
    1,
    start > 3 ? 'ellipsis-start' : 2,
    ...middle,
    end < totalPage - 2 ? 'ellipsis-end' : totalPage - 1,
    totalPage,
  ]
}
