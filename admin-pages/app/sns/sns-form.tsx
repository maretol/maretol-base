'use client'

import { useActionState, useEffect, useState } from 'react'
import { postSNSTextAction } from './actions'
import { SubmitButton } from '@/components/submit-button'

const TARGET_LABELS: Record<string, string> = {
  twitter: 'Twitter/X',
  bluesky: 'Bluesky',
  misskey: 'Misskey',
  nostr: 'Nostr',
  mastodon: 'Mastodon',
}

export function SNSPostForm() {
  const [state, formAction] = useActionState(postSNSTextAction, {})
  const [text, setText] = useState('')

  // すべてのSNSへ投稿できたら入力をクリアする
  // 一部でも失敗したときは、文面を修正して再送できるよう保持する（成功済みSNSへの再送は二重投稿になる点に注意）
  const allSucceeded = !!state.results?.length && state.results.every((r) => r.success)
  useEffect(() => {
    if (allSucceeded) {
      setText('')
    }
  }, [allSucceeded, state])

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm('連携SNSに投稿します。投稿は取り消せません。よろしいですか？')) {
          e.preventDefault()
        }
      }}
      className="max-w-2xl space-y-4"
    >
      <div>
        <label htmlFor="sns-post-text" className="block text-sm font-medium">
          文面
        </label>
        <textarea
          id="sns-post-text"
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          required
          placeholder="投稿する文面"
          className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm"
        />
        <p className="mt-1 text-xs text-gray-400">
          {text.length} 文字。文字数上限は各SNSごとに異なります（Twitter/X は全角140文字相当）
        </p>
      </div>

      {state.error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
      )}

      {state.results && (
        <ul className="space-y-1 rounded-md border border-gray-200 bg-white p-3 text-sm">
          {state.results.map((r) => (
            <li key={r.target} className={r.success ? 'text-green-700' : 'text-red-700'}>
              {TARGET_LABELS[r.target] ?? r.target}:{' '}
              {r.success ? '投稿しました' : `失敗（${r.error ?? '不明なエラー'}）`}
            </li>
          ))}
        </ul>
      )}

      <SubmitButton pendingText="投稿中...">SNSに投稿</SubmitButton>
    </form>
  )
}
