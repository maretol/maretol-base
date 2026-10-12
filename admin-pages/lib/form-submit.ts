import { startTransition, type FormEvent } from 'react'

type Dispatch = (formData: FormData) => void

// 編集フォームの送信。<form action> や <button formAction> に渡さず、submit イベントから自分で dispatch する。
// React 19 は form action の完了後にそのフォームを form.reset() するため、非制御の入力が defaultValue
// （保存前の値）に戻ってしまう。この経路なら reset は起きず、編集中の内容がそのまま残る。
// 押されたボタンの name="intent" の値で保存・プレビューなどを振り分け、実行した intent を返す（フォーム側で、どの操作の
// 結果を表示するかの判断に使う）。intent の無い送信（name を付け忘れたボタン、requestSubmit()）は黙って保存に落とさず
// 例外にする（意図しない D1 への書き込みを防ぐ）
export function submitByIntent<K extends string>(e: FormEvent<HTMLFormElement>, dispatchers: Record<K, Dispatch>): K {
  e.preventDefault()
  const formData = new FormData(e.currentTarget)
  const submitter = (e.nativeEvent as SubmitEvent).submitter
  const pressed = submitter instanceof HTMLButtonElement && submitter.name === 'intent' ? submitter.value : ''
  const intent = (Object.keys(dispatchers) as K[]).find((k) => k === pressed)
  if (intent === undefined) {
    throw new Error(`フォームの送信に intent がありません（submitter: ${submitter?.outerHTML ?? 'なし'}）`)
  }
  startTransition(() => dispatchers[intent](formData))
  return intent
}
