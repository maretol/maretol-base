import { pageLimit } from './static'

// マンガのシリーズIDとして許容する形式（admin-pages のID規則と同じ）
const SERIES_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

/**
 * searchParamsからページネーション情報を取得
 */
export function parsePaginationParams(searchParams: { [key: string]: string | string[] | undefined }) {
  const page = searchParams['p']
  const pageNumber = isValidPage(page) ? Number(page) : 1
  const offset = (pageNumber - 1) * pageLimit
  const limit = pageLimit

  return { pageNumber, offset, limit }
}

/**
 * searchParamsからdraftKeyを取得
 */
export function parseDraftKey(searchParams: { [key: string]: string | string[] | undefined }): string | undefined {
  return firstString(searchParams['draftKey'])
}

/**
 * searchParamsからタグ情報を取得
 */
export function parseTagParams(searchParams: { [key: string]: string | string[] | undefined }) {
  const tagID = firstString(searchParams['tag_id'])

  return { tagID }
}

/**
 * searchParamsからマンガのシリーズIDを取得
 * ID形式に合わない値は指定なし（全件表示）として扱う
 */
export function parseSeriesParams(searchParams: { [key: string]: string | string[] | undefined }) {
  const candidate = firstString(searchParams['series'])
  const seriesID = candidate !== undefined && SERIES_ID_PATTERN.test(candidate) ? candidate : undefined

  return { seriesID }
}

/**
 * クエリ値から文字列を1つ取り出す。同名キーが複数ある場合は先頭を採用する
 */
function firstString(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined
}

/**
 * ページ番号として有効かチェック
 */
function isValidPage(page: string | string[] | undefined): boolean {
  if (page === undefined) return false
  if (typeof page === 'string') return !isNaN(Number(page))
  return false
}
