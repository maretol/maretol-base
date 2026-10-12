import type { ExistingPreviewInfo, PreviewActionState } from '@/lib/form-state'
import { URLNotice } from '@/components/url-notice'

// プレビュー URL の有効期間の説明。KV レコードの preview.persistent（TTL なし）に対応する（lib/draft_kv.ts）
export function expiryNote(persistent: boolean): string {
  return persistent ? '公開で保存するまで失効しません' : '3 日で失効します'
}

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
        <URLNotice
          label="プレビュー URL を発行しました（D1 には保存していません）"
          url={state.previewURL}
          note={expiryNote(state.persistent === true)}
        >
          {state.generatedID && (
            <span className="ml-2 text-xs text-blue-600">
              ID を {state.generatedID} にしました（保存時も同じ ID になります）
            </span>
          )}
        </URLNotice>
      )}
    </>
  )
}

type ExistingProps = {
  preview: ExistingPreviewInfo
}

// 編集ページを開いたときに、KV に残っているプレビューを見せる。何を指す URL か（保存した下書きか、保存していない内容か）と
// 失効の有無は KV レコードの preview から決める（D1 の行の状態から推定しない）
export function ExistingPreview({ preview }: ExistingProps) {
  return (
    <URLNotice
      tone="gray"
      label={preview.unsaved ? '保存前プレビューの URL（保存していない内容）' : '下書きのプレビュー URL'}
      url={preview.previewURL}
      note={expiryNote(preview.persistent)}
    />
  )
}
