import { useState, useTransition, type CSSProperties, type SubmitEvent } from 'react'
import { EyeIcon, EyeOffIcon, LockIcon } from 'lucide-react'
import type { UnlockResult } from '@/pages/blog/[article_id]/unlock'

// 限定公開記事の閲覧コードの入力フォーム。コードを POST し、解錠できたらページを読み込み直して本文を表示する。
// class はサーバー側で組み立てて渡す（tailwind-merge などをクライアントへ持ち込まないため）

async function requestUnlock(action: string, body: FormData): Promise<UnlockResult> {
  try {
    const response = await fetch(action, { method: 'POST', body, headers: { Accept: 'application/json' } })
    return (await response.json()) as UnlockResult
  } catch {
    return { ok: false, error: '通信に失敗しました。時間をおいてもう一度お試しください' }
  }
}

type Props = {
  // 解錠の POST 先（/blog/{id}/unlock。下書きプレビュー中は draftKey 付き）
  action: string
  inputClassName: string
  buttonClassName: string
}

export default function SecretGateForm({ action, inputClassName, buttonClassName }: Props) {
  // 入力中のコードをマスクするか（既定はマスクしない）
  const [masked, setMasked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const body = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await requestUnlock(action, body)
      if (result.ok) {
        // 解錠の Cookie が付いたので、読み込み直すと本文が出る
        location.reload()
        return
      }
      setError(result.error ?? '認証できませんでした')
    })
  }

  return (
    // JS が動く前に送信された場合に備えて、通常のフォーム送信でも同じ宛先へ POST する
    <form
      method="post"
      action={action}
      onSubmit={onSubmit}
      className="flex w-full max-w-sm flex-col items-center gap-3"
    >
      {/*
        パスワードマネージャに保存させないため type="password" を使わない
        （password 欄では autocomplete="off" がブラウザに無視され、保存の提案が出る）。
        既定はマスクしない表示で、ボタンでマスク表示に切り替えられる
        （マスクは -webkit-text-security を使うので Chromium / Safari だけ。Firefox では効かない）
      */}
      <div className="relative w-full">
        <input
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
          className={inputClassName}
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
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="submit" disabled={pending} className={buttonClassName}>
        <LockIcon className="h-4 w-4" />
        {pending ? '確認中...' : '解錠する'}
      </button>
    </form>
  )
}
