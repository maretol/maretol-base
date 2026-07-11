// microCMS互換のランダムID（英小文字+数字）を生成する
// 既存コンテンツのIDはインポートで保持しているため、これは新規作成時のデフォルト用
export function generateContentID(length = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

// プレビュー用の推測不能なdraftKeyを生成する
export function generateDraftKey(): string {
  return crypto.randomUUID().replaceAll('-', '')
}
