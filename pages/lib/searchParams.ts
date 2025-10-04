import { pageLimit, maxTagCount } from './static'

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
  const rawTagIDs = searchParams['tag_id']
  const rawTagNames = searchParams['tag_name']

  const tagIDs = normalizeStringArray(rawTagIDs, maxTagCount)
  const tagNames = normalizeStringArray(rawTagNames, maxTagCount)

  return { tagIDs, tagNames }
}

/**
 * ページ番号として有効かチェック
 */
function isValidPage(page: string | string[] | undefined): boolean {
  if (page === undefined) return false
  if (typeof page === 'string') return !isNaN(Number(page))
  return false
}

/**
 * string | string[] | undefined を string[] に正規化
 */
function normalizeStringArray(value: string | string[] | undefined, maxLength?: number): string[] {
  if (value === undefined) return []

  const arr = typeof value === 'string' ? [value] : value
  return maxLength ? arr.slice(0, maxLength) : arr
}
