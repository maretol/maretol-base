// server action に渡された FormData から文字列の項目を取り出す
// 未送信（null）とファイルは空文字として扱い、前後の空白は落とす
export function text(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

// 空文字は null にする（任意項目の列向け）
export function textOrNull(formData: FormData, name: string): string | null {
  const value = text(formData, name)
  return value === '' ? null : value
}
