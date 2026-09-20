import type { bandeDessineeResult } from 'api-types'

function getFirstPage(filename: string, firstPageNumber: number, format: string) {
  const strPageNumber = firstPageNumber.toString()
  const formattedPageNumber = strPageNumber.padStart(3, '0')
  const firstPageFileName = `${filename}_${formattedPageNumber}.${format}`
  return firstPageFileName
}

// 一覧の先頭要素からシリーズ名を取得する。シリーズ絞り込み時の見出しと title で共有する
function getSeriesName(bandeDessinees: bandeDessineeResult[]) {
  return bandeDessinees[0]?.series?.series_name
}

// マンガページのパス。リンクと router.push で共有する
function comicPath(id: string) {
  return `/comics/${id}`
}

// シリーズで絞り込んだマンガ一覧のパス（クエリキーは searchParams.ts の parseSeriesParams と対応）
function comicSeriesPath(seriesId: string) {
  return `/comics?series=${seriesId}`
}

export { getFirstPage, getSeriesName, comicPath, comicSeriesPath }
