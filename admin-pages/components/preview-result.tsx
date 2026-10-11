import type { PreviewActionState } from '@/lib/form-state'

type PreviewProps = {
  state: PreviewActionState
}

// 「プレビュー URL を発行」の結果表示。D1 には保存していないことと、URL の有効期間を添える
export function PreviewResult({ state }: PreviewProps) {
  return (
    <>
      {state.error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
      )}
      {state.previewURL && (
        <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          プレビュー URL を発行しました（D1 には保存していません）:{' '}
          <a href={state.previewURL} target="_blank" rel="noopener noreferrer" className="underline">
            {state.previewURL}
          </a>
          <span className="ml-2 text-xs text-blue-600">
            {state.persistent ? '下書きの間は失効しません（公開すると消えます）' : '3 日で失効します'}
          </span>
          {state.generatedID && (
            <span className="ml-2 text-xs text-blue-600">ID を {state.generatedID} にしました（保存時も同じ ID になります）</span>
          )}
        </p>
      )}
    </>
  )
}

type ExistingProps = {
  url: string
  // D1 の行が下書き（PUBLISH 以外）か。公開済みなら、残っているのは保存していない内容の保存前プレビュー
  draft: boolean
}

// 編集ページを開いたときに、すでに発行済みのプレビュー URL（KV に残っているもの）を見せる
export function ExistingPreview({ url, draft }: ExistingProps) {
  return (
    <p className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
      {draft ? '下書きのプレビュー URL' : '保存前プレビューの URL（保存していない内容。3 日で失効）'}:{' '}
      <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
        {url}
      </a>
    </p>
  )
}
