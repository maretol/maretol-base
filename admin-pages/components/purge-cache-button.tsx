'use client'

import { useActionState } from 'react'
import type { PurgeActionState } from '@/lib/form-state'

type Props = {
  // サーバーアクション（サービスごとに異なるパージ処理を渡す）
  action: (prev: PurgeActionState, formData: FormData) => Promise<PurgeActionState>
  contentID: string
  label: string
  description?: string
}

// 編集画面用のキャッシュ削除ボタン。編集中の本文を失わないようページ遷移させず結果を表示する
export function PurgeCacheButton({ action, contentID, label, description }: Props) {
  const [state, formAction, pending] = useActionState(action, {})

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
      <input type="hidden" name="id" value={contentID} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'パージ中...' : label}
      </button>
      {state.done && <span className="text-sm text-green-700">{state.done}</span>}
      {state.error && <span className="text-sm text-red-700">{state.error}</span>}
      {description && <span className="text-xs text-gray-400">{description}</span>}
    </form>
  )
}
