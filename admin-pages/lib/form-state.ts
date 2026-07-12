// useActionState で受け渡すプレビューアクションの結果
// プレビューはページ遷移させない（遷移すると編集中の本文が消えるため）
export type PreviewActionState = {
  previewURL?: string
  error?: string
}

// useActionState で受け渡すキャッシュパージアクションの結果
// 編集画面上のボタンのためページ遷移させない（遷移すると編集中の本文が消えるため）
export type PurgeActionState = {
  done?: string
  error?: string
}
