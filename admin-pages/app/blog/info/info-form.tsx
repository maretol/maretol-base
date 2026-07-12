import type { blogInfoRow } from 'api-types'
import { createBlogInfoAction, updateBlogInfoAction } from '../actions'
import { SubmitButton } from '@/components/submit-button'

type Props = {
  mode: 'new' | 'edit'
  info?: blogInfoRow
  error?: string
  saved?: boolean
}

export function InfoForm({ mode, info, error, saved }: Props) {
  const action = mode === 'new' ? createBlogInfoAction : updateBlogInfoAction
  const inputClass = 'mt-1 w-full rounded-md border border-gray-300 p-2 text-sm'

  return (
    <div className="space-y-4">
      {saved && <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">保存しました</p>}
      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form action={action} className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium">ID（空欄でランダム生成）</label>
            {mode === 'new' ? (
              <input name="id" className={`${inputClass} font-mono`} />
            ) : (
              <>
                <input type="hidden" name="id" value={info?.id} />
                <p className="mt-1 font-mono text-sm text-gray-500">{info?.id}</p>
              </>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium">ページパス *（/ 始まり）</label>
            <input
              name="page_pathname"
              defaultValue={info?.page_pathname ?? ''}
              required
              placeholder="/about"
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">タイトル</label>
            <input name="title" defaultValue={info?.title ?? ''} className={inputClass} />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3">
            <label className="block text-sm font-medium">本文</label>
            <select
              name="main_text_format"
              defaultValue={info?.main_text_format ?? 'markdown'}
              className="rounded-md border border-gray-300 p-1 text-xs"
            >
              <option value="markdown">Markdown</option>
              <option value="html">HTML（旧CMS形式）</option>
            </select>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            形式を変更しても本文は自動変換されません。切り替える場合は書き直しとセットで保存してください
          </p>
          <textarea
            name="main_text"
            defaultValue={info?.main_text ?? ''}
            rows={20}
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">公開状態</label>
          <select
            name="status"
            defaultValue={info?.status ?? 'PUBLISH'}
            className="mt-1 rounded-md border border-gray-300 p-2 text-sm"
          >
            <option value="PUBLISH">公開</option>
            <option value="DRAFT">下書き</option>
            <option value="CLOSED">非公開</option>
          </select>
        </div>

        <SubmitButton pendingText="保存中...">保存</SubmitButton>
      </form>
    </div>
  )
}
