'use client'

import { Button } from '@/components/ui/button'
import { EyeIcon, EyeOffIcon, LockIcon } from 'lucide-react'
import { useActionState, useState, type CSSProperties } from 'react'
import { unlockSecretArticle, type UnlockState } from './actions'
import { Input } from '@/components/ui/input'
import Form from 'next/form'

const initialState: UnlockState = { ok: false }

export default function SecretGate({ articleID, title }: { articleID: string; title: string }) {
  // articleID を bind して useActionState のシグネチャ (state, formData) に合わせる
  const action = unlockSecretArticle.bind(null, articleID)
  const [state, formAction, pending] = useActionState(action, initialState)
  // 入力中のコードのマスク表示の切り替え（デフォルトは非マスク = 表示）
  const [masked, setMasked] = useState(false)

  return (
    <div className="flex flex-col items-center gap-6 rounded-md bg-gray-100 px-6 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <LockIcon className="h-8 w-8 text-gray-500" />
        <h1 className="text-xl font-bold font-suse">{title}</h1>
        <p className="text-sm text-gray-600">この記事は限定公開です。閲覧コードを入力してください。</p>
      </div>
      <Form action={formAction} className="flex w-full max-w-sm flex-col items-center gap-3">
        {/*
          パスワードマネージャに保存させないため type="password" を使わない。
          （password 欄では autocomplete="off" がブラウザに無視され保存提案が出るため）
          デフォルトは非マスク表示。マスクボタンで任意にマスク表示へ切り替えられる
          （マスクは -webkit-text-security 利用のため Chromium/Safari のみ。Firefox では効かない）
        */}
        <div className="relative w-full">
          <Input
            name="secret_code"
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
            data-bwignore
            aria-label="閲覧コード"
            style={{ WebkitTextSecurity: masked ? 'disc' : 'none' } as CSSProperties}
            className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 focus:border-gray-500 focus:outline-none"
            placeholder="閲覧コード"
          />
          <button
            type="button"
            onClick={() => setMasked((m) => !m)}
            aria-label={masked ? 'コードを表示' : 'コードをマスク'}
            aria-pressed={masked}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {masked ? <EyeIcon className="h-5 w-5" /> : <EyeOffIcon className="h-5 w-5" />}
          </button>
        </div>
        {state.error && <p className="text-sm text-red-500">{state.error}</p>}
        <Button type="submit" disabled={pending} className="w-full gap-1 font-suse">
          <LockIcon className="h-4 w-4" />
          {pending ? '確認中...' : '解錠する'}
        </Button>
      </Form>
    </div>
  )
}
