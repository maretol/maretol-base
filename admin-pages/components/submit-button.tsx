'use client'

import { useFormStatus } from 'react-dom'

type Props = {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'md' | 'sm'
  pendingText?: string
  formAction?: string | ((formData: FormData) => void | Promise<void>)
  // useActionState の dispatch を自分で呼ぶフォーム（lib/form-submit.ts）では useFormStatus が効かないので、
  // 送信中かどうかを外から渡す。省略時は useFormStatus を見る
  pending?: boolean
  // 送信中ではないが押せなくする（同じフォームの別の操作が動いている間など）
  disabled?: boolean
  // 押されたボタンの判別用（name="intent" value="save" など）
  name?: string
  value?: string
}

const VARIANT_CLASS = {
  primary: 'bg-gray-900 text-white hover:bg-gray-700',
  secondary: 'border border-gray-300 hover:bg-gray-100',
  danger: 'bg-red-700 text-white hover:bg-red-600',
}

const SIZE_CLASS = {
  md: 'px-4 py-2',
  sm: 'px-3 py-1.5',
}

const DISABLED_CLASS = 'disabled:cursor-not-allowed disabled:opacity-50'

// フォームの送信中は同一フォーム内の全送信ボタンを無効化し、二度押し（多重送信）を防ぐ
export function SubmitButton({
  children,
  variant = 'primary',
  size = 'md',
  pendingText = '処理中...',
  formAction,
  pending,
  disabled = false,
  name,
  value,
}: Props) {
  const status = useFormStatus()
  const isPending = pending ?? status.pending
  return (
    <button
      type="submit"
      formAction={formAction}
      name={name}
      value={value}
      disabled={isPending || disabled}
      aria-busy={isPending}
      className={`rounded-md text-sm ${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]} ${DISABLED_CLASS}`}
    >
      {isPending ? pendingText : children}
    </button>
  )
}
