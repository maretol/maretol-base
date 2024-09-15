export function convertJST(datetime: string) {
  const date = new Date(datetime)
  return date.toLocaleString('ja-JP', {
    hour12: false,
    timeZone: 'Asia/Tokyo',
    dateStyle: 'short',
    timeStyle: 'long',
  })
}

export function getCurrentTime() {
  const date = new Date()
  return date.toISOString()
}
