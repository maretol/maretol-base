// ISO 8601 UTC のタイムスタンプを一覧表示用のJST文字列（YYYY/MM/DD HH:mm）に変換する
export function formatJST(iso: string | null | undefined): string {
  if (!iso) {
    return '-'
  }
  return new Date(iso).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 発行日など日付のみの表示用（YYYY/MM/DD）
export function formatJSTDate(iso: string | null | undefined): string {
  if (!iso) {
    return '-'
  }
  return new Date(iso).toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
