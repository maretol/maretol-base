// useActionState で受け渡すプレビューアクションの結果
// プレビューはページ遷移させない（遷移すると編集中の本文が消えるため）
export type PreviewActionState = {
  previewURL?: string
  error?: string
}
