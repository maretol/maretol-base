/**
 * 一覧ページのページネーション共通処理
 * クエリパラメータは公開サイトと同じ `p`（1始まり）。編集画面では「戻り先の一覧ページ番号」として同じ `p` を引き回す
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

// action の redirect 用: フォームの hidden `p` を既存のクエリ文字列の後ろに連結する
export function pageQuerySuffix(formData: FormData): string {
  const raw = formData.get('p')
  const page = typeof raw === 'string' ? parsePageParam(raw) : null
  return page !== null && page > 1 ? `&p=${page}` : ''
}
