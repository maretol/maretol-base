// 部品のデータ取得に失敗し、代わりの表示で描画したことを記録する。
// 記録のあるページはエッジに長く持たせない（src/mw/cache.ts）。
// キャッシュのヘッダはページの frontmatter で決まり、部品の描画はその後なので、部品からヘッダは直接変えられない
export function markDegraded(locals: App.Locals, reason: string): void {
  ;(locals.degraded ??= []).push(reason)
}
