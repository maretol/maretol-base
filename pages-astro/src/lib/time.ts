export function convertJST(datetime: string): string {
  return new Date(datetime).toLocaleString('ja-JP', {
    hour12: false,
    timeZone: 'Asia/Tokyo',
    dateStyle: 'short',
    timeStyle: 'long',
  })
}
