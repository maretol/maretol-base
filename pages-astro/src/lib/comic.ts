import type { bandeDessineeResult } from 'api-types'

// 漫画の 1 ページ目のファイル名（{filename}_{3 桁のページ番号}.{format}）
export function getFirstPage(filename: string, firstPageNumber: number, format: string): string {
  return `${filename}_${firstPageNumber.toString().padStart(3, '0')}.${format}`
}

// 漫画の表紙の URL。表紙が無ければ 1 ページ目を使う
export function getComicCoverURL(comic: bandeDessineeResult): string {
  const baseURL = comic.contents_url.replaceAll('/index.json', '')
  return `${baseURL}/${comic.cover || getFirstPage(comic.filename, comic.first_page, comic.format[0])}`
}
