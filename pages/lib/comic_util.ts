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

export { getFirstPage, getSeriesName }
