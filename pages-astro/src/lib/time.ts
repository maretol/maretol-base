// 日付だけ（例: 2026/03/22）
export function convertJSTDate(datetime: string): string {
  return new Date(datetime).toLocaleString('ja-JP', {
    hour12: false,
    timeZone: 'Asia/Tokyo',
    dateStyle: 'short',
  })
}

export function convertJST(datetime: string): string {
  return new Date(datetime).toLocaleString('ja-JP', {
    hour12: false,
    timeZone: 'Asia/Tokyo',
    dateStyle: 'short',
    timeStyle: 'long',
  })
}
