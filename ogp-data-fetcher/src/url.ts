// OGP の og:image / og:url は相対パスやプロトコル相対で書かれていることがあるので、取得したページの URL を基準に絶対 URL にする。
// http(s) 以外（javascript: など）はカードに埋め込まないので空文字にする
export function resolveHTTPURL(value: string, base: string): string {
  if (value === '') return ''
  try {
    const url = new URL(value, base)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
  } catch {
    return ''
  }
}
