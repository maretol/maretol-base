import type { DraftSyncResult, PreviewActionState, SaveActionState } from './form-state'

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

// D1 への保存は済んでいて、KV のプレビューの同期（更新・削除）だけ失敗したとき。保存できたことは伝え、警告として添える
export function draftSyncFailed(e: unknown): DraftSyncResult {
  console.error('draft sync error:', e)
  return { warning: `保存はできましたが、プレビューの更新に失敗しました: ${errorMessage(e)}` }
}

// プレビュー URL の発行（KV 書き込み）に失敗したとき
export function previewFailed(e: unknown): PreviewActionState {
  console.error('preview error:', e)
  return { error: `プレビュー URL の発行に失敗しました: ${errorMessage(e)}` }
}
