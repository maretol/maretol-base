import type { bandeDessineeResult } from 'api-types'

// 漫画の URL・画像のファイル名・表示の定数。ビューワの island（ブラウザ側）からも使うので、サーバー専用のものは置かない

// 見開き表示にする画面の幅（px）。これ未満は単ページ
export const COMIC_MODE_THRESHOLD = 980
// ページ送りのアニメーションの時間（ミリ秒）
export const COMIC_SCROLL_SPEED = 150

// シリーズ ID として受け付ける形式（admin の ID の規則と同じ）
export const SERIES_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

export function comicPath(comicID: string): string {
  return `/comics/${comicID}`
}

// シリーズで絞り込んだ漫画の一覧（クエリのキーは mw/query.ts の表と対応）
export function comicSeriesPath(seriesID: string): string {
  return `/comics?series=${seriesID}`
}

// ページの画像の置き場所（contents_url から index.json を除いたもの）
export function getComicBaseURL(contentsURL: string): string {
  return contentsURL.replaceAll('/index.json', '')
}

// ページの画像のファイル名（{filename}_{3 桁のページ番号}.{format}）
export function getPageFileName(filename: string, pageNumber: number, format: string): string {
  return `${filename}_${pageNumber.toString().padStart(3, '0')}.${format}`
}

// 漫画の 1 ページ目のファイル名
export function getFirstPage(filename: string, firstPageNumber: number, format: string): string {
  return getPageFileName(filename, firstPageNumber, format)
}

// 漫画の表紙の URL。表紙が無ければ 1 ページ目を使う
export function getComicCoverURL(comic: bandeDessineeResult): string {
  return `${getComicBaseURL(comic.contents_url)}/${comic.cover || getFirstPage(comic.filename, comic.first_page, comic.format[0])}`
}

// 一覧の先頭の要素からシリーズ名を取る。シリーズで絞り込んだ一覧の見出しと title で使う
export function getSeriesName(bandeDessinees: bandeDessineeResult[]): string | undefined {
  return bandeDessinees[0]?.series?.series_name
}
