import { pageLimit } from './static'

// マンガのシリーズIDとして許容する形式（admin-pages のID規則と同じ）
const SERIES_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

// ページ番号として許容する形式（admin-pages/lib/pagination.ts と同じ）。桁あふれを避けるため9桁までに制限する
const PAGE_PATTERN = /^[1-9]\d{0,8}$/

/**
 * searchParamsからページネーション情報を取得（issue #1283）
 * p が未指定なら1ページ目。次の場合は null を返すので、呼び出し側で p を外した URL（getHrefWithoutPage）へ redirect する
 * - 正の整数以外（小数、0、負数、`1e1` のような別表記、空文字、複数指定など）
 * - `p=1`（1ページ目は p を省略した URL に統一する）
 */
export function parsePaginationParams(searchParams: { [key: string]: string | string[] | undefined }) {
  const pageNumber = parsePageParam(searchParams['p'])
  if (pageNumber === null) return null
  const offset = (pageNumber - 1) * pageLimit
  const limit = pageLimit

  return { pageNumber, offset, limit }
}

/**
 * 受け取ったクエリから p だけを取り除いた URL を返す。p が不正なときの redirect 先に使う
 * p 以外は値も順序もそのまま引き継ぐ（`illust_id` や `draftKey`、計測用のパラメータなどを落とさないため）
 */
export function getHrefWithoutPage(path: string, searchParams: { [key: string]: string | string[] | undefined }) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'p' || value === undefined) continue
    for (const v of Array.isArray(value) ? value : [value]) {
      params.append(key, v)
    }
  }
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

/**
 * searchParamsからdraftKeyを取得
 */
export function parseDraftKey(searchParams: { [key: string]: string | string[] | undefined }): string | undefined {
  return firstString(searchParams['draftKey'])
}

/**
 * searchParamsからタグ情報を取得
 * tagName は記事内のタグのリンクが付ける表示用の値で、検索には使わない。ページネーションのリンクに引き継ぐためだけに返す
 */
export function parseTagParams(searchParams: { [key: string]: string | string[] | undefined }) {
  const tagID = firstString(searchParams['tag_id'])
  const tagName = firstString(searchParams['tag_name'])

  return { tagID, tagName }
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
 * p の値をページ番号に変換する。未指定は1、受け付けない値は null
 */
function parsePageParam(page: string | string[] | undefined): number | null {
  if (page === undefined) return 1
  if (typeof page !== 'string' || !PAGE_PATTERN.test(page) || page === '1') return null
  return Number(page)
}
