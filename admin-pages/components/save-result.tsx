import type { SaveActionState } from '@/lib/form-state'
import { PurgeFailedNotice } from '@/components/purge-failed-notice'
import { URLNotice } from '@/components/url-notice'
import { expiryNote } from '@/components/preview-result'

type Props = {
  state: SaveActionState
  // パージ失敗時の回復手段の案内。編集画面のキャッシュ削除ボタンがあるコンテンツはその操作を書く。
  // 無ければキャッシュ管理ページへの案内（PurgeFailedNotice）を出す
  purgeHint?: string
}

// 保存アクションの結果表示。ページ遷移せずに state で受け取った結果を、フォームの上に出す
export function SaveResult({ state, purgeHint }: Props) {
  return (
    <>
      {state.saved && (
        <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {state.created ? '作成しました' : '保存しました'}
        </p>
      )}
      {state.info && (
        <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">自動連携: {state.info}</p>
      )}
      {state.warning && (
        <p className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">{state.warning}</p>
      )}
      {state.purgeFailed &&
        (purgeHint ? (
          <p className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            公開サイトのキャッシュ削除に失敗しました。公開サイトに反映されていない場合は、{purgeHint}
          </p>
        ) : (
          <PurgeFailedNotice />
        ))}
      {/* 下書き・非公開で保存したときの同期結果。TTL なしで書いている（lib/draft_kv.ts） */}
      {state.previewURL && <URLNotice label="下書きのプレビュー URL" url={state.previewURL} note={expiryNote(true)} />}
      {state.publicURL && <URLNotice label="公開 URL" url={state.publicURL} />}
      {state.error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
      )}
    </>
  )
}
