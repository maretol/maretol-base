// 文字コードの判定。HTTP の content-type と HTML の meta の両方で使う

// `text/html; charset="utf-8"` のような値から charset のラベルを取り出す。
// RFC 7231 では引用符付きも有効なので剥がし、無ければ undefined
export function parseCharsetParam(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const matched = /charset\s*=\s*"?([^";\s]+)"?/i.exec(value)
  return matched?.[1].toLowerCase()
}

// ラベルから TextDecoder を作る。未知のラベルは RangeError になるので、そのときは UTF-8 にする。
// 文字化けはしてもカード全体を失敗にはしない
export function createTextDecoder(label: string | undefined): TextDecoder {
  if (label === undefined) return new TextDecoder()
  try {
    return new TextDecoder(label)
  } catch (e) {
    console.warn(`[charset.ts] unknown charset label "${label}", fallback to UTF-8:`, e)
    return new TextDecoder()
  }
}
