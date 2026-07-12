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

// ブログ編集画面からのカテゴリ追加（インライン）の結果
// 追加済みカテゴリを累積して返し、フォーム側でチェックボックスに反映する（ページ遷移させない）
export type AddCategoryState = {
  categories: { id: string; name: string }[]
  error?: string
}
