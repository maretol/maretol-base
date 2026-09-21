/**
 * 一覧ページのページネーション共通処理
 * クエリパラメータは公開サイトと同じ `p`（1始まり）
 */
export const PAGE_SIZE = 50

// 桁あふれを避けるため9桁までに制限する
const PAGE_PATTERN = /^[1-9]\d{0,8}$/

// 未指定は1ページ目、正の整数以外は null（呼び出し側でパラメータなしの一覧へ redirect する）
export function parsePageParam(raw: string | string[] | undefined): number | null {
  if (raw === undefined) {
    return 1
  }
  if (typeof raw !== 'string' || !PAGE_PATTERN.test(raw)) {
    return null
  }
  return Number(raw)
}

// 1ページ目は `p` を省略する
export function withPage(path: string, page: number): string {
  return page <= 1 ? path : `${path}?p=${page}`
}
