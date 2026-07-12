'use client'

import { useFormStatus } from 'react-dom'

type Props = {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'md' | 'sm'
  pendingText?: string
  formAction?: string | ((formData: FormData) => void | Promise<void>)
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

// フォームの送信中は同一フォーム内の全送信ボタンを無効化し、二度押し（多重送信）を防ぐ
export function SubmitButton({ children, variant = 'primary', size = 'md', pendingText = '処理中...', formAction }: Props) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={pending}
      aria-busy={pending}
      className={`rounded-md text-sm ${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {pending ? pendingText : children}
    </button>
  )
}
