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
  const draftKey = searchParams['draftKey']
  return typeof draftKey === 'string' ? draftKey : undefined
}

/**
 * searchParamsからタグ情報を取得
 */
export function parseTagParams(searchParams: { [key: string]: string | string[] | undefined }) {
  const rawTagID = searchParams['tag_id']
  const tagID = typeof rawTagID === 'string' ? rawTagID : Array.isArray(rawTagID) ? rawTagID[0] : undefined

  return { tagID }
}

/**
 * searchParamsからマンガのシリーズIDを取得
 * ID形式に合わない値は指定なし（全件表示）として扱う
 */
export function parseSeriesParams(searchParams: { [key: string]: string | string[] | undefined }) {
  const rawSeriesID = searchParams['series']
  const candidate =
    typeof rawSeriesID === 'string' ? rawSeriesID : Array.isArray(rawSeriesID) ? rawSeriesID[0] : undefined
  const seriesID = candidate !== undefined && SERIES_ID_PATTERN.test(candidate) ? candidate : undefined

  return { seriesID }
}

/**
 * ページ番号として有効かチェック
 */
function isValidPage(page: string | string[] | undefined): boolean {
  if (page === undefined) return false
  if (typeof page === 'string') return !isNaN(Number(page))
  return false
}
