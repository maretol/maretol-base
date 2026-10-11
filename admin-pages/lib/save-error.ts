import type { SaveActionState } from './form-state'

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

// D1 の読み書きで投げられた例外を保存結果のエラーにする（issue #1311）。
// 制約違反などで Next のエラー画面になって入力が消えるのを防ぐ。
// 管理画面は Cloudflare Access の内側で、エラーの詳細はコンソールでも追うので、メッセージはそのまま出す
export function saveFailed(e: unknown): SaveActionState {
  console.error('save error:', e)
  return { error: `保存に失敗しました: ${errorMessage(e)}` }
}
