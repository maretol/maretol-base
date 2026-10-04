// 漫画の 1 ページ目のファイル名（{filename}_{3 桁のページ番号}.{format}）
export function getFirstPage(filename: string, firstPageNumber: number, format: string): string {
  return `${filename}_${firstPageNumber.toString().padStart(3, '0')}.${format}`
}
