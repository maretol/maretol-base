import { startTransition, type FormEvent } from 'react'

type Dispatch = (formData: FormData) => void

// 編集フォームの送信。<form action> や <button formAction> に渡さず、submit イベントから自分で dispatch する。
// React 19 は form action の完了後にそのフォームを form.reset() するため、非制御の入力が defaultValue
// （保存前の値）に戻ってしまう。この経路なら reset は起きず、編集中の内容がそのまま残る。
// 押されたボタンの name="intent" の値で保存・プレビューなどを振り分ける。intent の無い送信（name を付け忘れた
// ボタン、requestSubmit()）は黙って保存に落とさず例外にする（意図しない D1 への書き込みを防ぐ）
export function submitByIntent(e: FormEvent<HTMLFormElement>, dispatchers: Record<string, Dispatch>): void {
  e.preventDefault()
  const formData = new FormData(e.currentTarget)
  const submitter = (e.nativeEvent as SubmitEvent).submitter
  const intent = submitter instanceof HTMLButtonElement && submitter.name === 'intent' ? submitter.value : ''
  if (!Object.hasOwn(dispatchers, intent)) {
    throw new Error(`フォームの送信に intent がありません（submitter: ${submitter?.outerHTML ?? 'なし'}）`)
  }
  const dispatch = dispatchers[intent]
  startTransition(() => dispatch(formData))
}
