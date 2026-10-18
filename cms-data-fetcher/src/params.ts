// HTTP のクエリと RPC の引数に共通する、一覧取得のパラメータの解釈（issue #1307）

// 一覧の件数の既定値と上限。上限は D1 のバインド上限（1 クエリ 100 個）を超えないために置く。
// 一覧の後にカテゴリ・タグを付ける IN 句（getCategoriesByContentIDs / getTagsByAtelierIDs）は
// 返した件数分のプレースホルダを作るので、件数が 100 を超えると D1_ERROR で落ちる。公開サイトが渡す最大は RSS の 20
export const DEFAULT_LIMIT = 10
export const MAX_LIMIT = 50

// タグ絞り込みで同時に指定できるタグの数
export const MAX_TAG_IDS = 10

// 1〜MAX_LIMIT の整数だけ採用する。MAX_LIMIT 超は MAX_LIMIT に丸め、それ以外（未指定・0 以下・小数・数値でない文字列）は既定値。
// SQLite の LIMIT は負数で「制限なし」になるので、そのまま渡してはいけない
export function parseLimit(limit: string | null | undefined): number {
  const parsed = toInteger(limit)
  if (parsed === null || parsed < 1) {
    return DEFAULT_LIMIT
  }
  return Math.min(parsed, MAX_LIMIT)
}

// 0 以上の整数だけ採用し、それ以外は 0
export function parseOffset(offset: string | null | undefined): number {
  const parsed = toInteger(offset)
  return parsed === null || parsed < 0 ? 0 : parsed
}

// タグ ID の並び。HTTP では `+` 区切りの文字列（URL では %2B。生の + は空白にデコードされるので、空白も区切りとして扱う）、
// RPC では配列で受ける。空文字と重複を落とす。
// 重複があると、絞り込みの HAVING COUNT(DISTINCT category_id) = 指定数 を満たせず常に 0 件になる
export function parseTagIDs(raw: string | string[] | null | undefined): string[] {
  if (raw === null || raw === undefined) {
    return []
  }
  const ids = Array.isArray(raw) ? raw : raw.split(/[+\s]+/)
  return [...new Set(ids.map((id) => id.trim()).filter((id) => id !== ''))]
}

function toInteger(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value.trim() === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}
