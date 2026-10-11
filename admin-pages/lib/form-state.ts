import type { SNSPostTextResult } from 'api-types'

// useActionState で受け渡す保存アクションの結果
// 更新はページ遷移させず結果を返す（遷移すると編集中の入力が消えるため）。新規作成は URL が /new から /{id}/edit に
// 変わるので action 内で遷移し、遷移先の編集ページが URL のクエリからこの型の初期状態を組み立てて表示する
export type SaveActionState = {
  saved?: boolean
  // 新規作成からの遷移（「作成しました」と表示する）
  created?: boolean
  error?: string
  // 保存に伴う自動処理の報告（マンガの前後巻の付け替えなど）
  info?: string
  // 保存はできたが、公開サイトのキャッシュ削除に失敗した
  purgeFailed?: boolean
}

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

// useActionState で受け渡すSNS自由文面投稿の結果
// 一部のSNSで失敗したときに文面を保持して再送できるよう、ページ遷移させない
export type SNSPostActionState = {
  results?: SNSPostTextResult[]
  error?: string
}

// ブログ編集画面からのカテゴリ追加（インライン）の結果
// 追加済みカテゴリを累積して返し、フォーム側でチェックボックスに反映する（ページ遷移させない）
export type AddCategoryState = {
  categories: { id: string; name: string }[]
  error?: string
  // 追加はできたが、公開サイトのキャッシュ削除に失敗した
  purgeFailed?: boolean
}
