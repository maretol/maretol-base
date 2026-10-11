import { startTransition, type FormEvent } from 'react'

type Dispatch = (formData: FormData) => void

// 編集フォームの送信。<form action> や <button formAction> に渡さず、submit イベントから自分で dispatch する。
// React 19 は form action の完了後にそのフォームを form.reset() するため、非制御の入力が defaultValue
// （保存前の値）に戻ってしまう。この経路なら reset は起きず、編集中の内容がそのまま残る。
// 押されたボタンの name="intent" の値で保存・プレビューなどを振り分け、該当が無ければ最初の dispatch を使う
export function submitByIntent(e: FormEvent<HTMLFormElement>, dispatchers: Record<string, Dispatch>): void {
  e.preventDefault()
  const formData = new FormData(e.currentTarget)
  const submitter = (e.nativeEvent as SubmitEvent).submitter
  const intent = submitter instanceof HTMLButtonElement && submitter.name === 'intent' ? submitter.value : ''
  const dispatch = dispatchers[intent] ?? Object.values(dispatchers)[0]
  startTransition(() => dispatch(formData))
}
