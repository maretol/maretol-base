/**
 * 一覧のページ取得（件数 + LIMIT/OFFSET）の共通処理
 */
export type PageRange = { limit: number; offset: number }
export type Paginated<T> = { items: T[]; total: number }

// 件数と一覧を batch で1往復にまとめる
// countSQL は件数を `total` として返し、listSQL は `LIMIT ?1 OFFSET ?2` で終わること
export async function paginatedQuery<T>(
  db: D1Database,
  countSQL: string,
  listSQL: string,
  page: PageRange
): Promise<Paginated<T>> {
  const [count, list] = await db.batch<{ total: number } | T>([
    db.prepare(countSQL),
    db.prepare(listSQL).bind(page.limit, page.offset),
  ])
  return {
    items: list.results as T[],
    total: (count.results[0] as { total: number } | undefined)?.total ?? 0,
  }
}
