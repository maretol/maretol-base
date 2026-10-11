'use client'

import { useActionState } from 'react'
import type { blogInfoRow } from 'api-types'
import { createBlogInfoAction, updateBlogInfoAction } from '../actions'
import type { SaveActionState } from '@/lib/form-state'
import { submitByIntent } from '@/lib/form-submit'
import { SubmitButton } from '@/components/submit-button'
import { ContentTextarea } from '@/components/content-textarea'
import { SaveResult } from '@/components/save-result'
import { StatusSelect } from '@/components/status-select'

type Props = {
  mode: 'new' | 'edit'
  info?: blogInfoRow
  // 新規作成から遷移してきたときの結果（作成した・パージに失敗した）。編集ページが URL のクエリから組み立てる
  initialState?: SaveActionState
}

export function InfoForm({ mode, info, initialState = {} }: Props) {
  // 保存はページ遷移させず結果を state で受け取る（遷移すると編集中の本文が消えるため）。
  // 新規作成だけは action 内で作成したページの編集画面へ遷移する（URL が変わるため）
  const [save, saveDispatch, saving] = useActionState(
    mode === 'new' ? createBlogInfoAction : updateBlogInfoAction,
    initialState
  )
  const inputClass = 'mt-1 w-full rounded-md border border-gray-300 p-2 text-sm'

  return (
    <div className="space-y-4">
      <SaveResult state={save} />

      {/* 送信は submit イベントから自分で dispatch する（form action に渡すと完了後に入力が reset されるため。lib/form-submit.ts） */}
      <form
        onSubmit={(e) => submitByIntent(e, { save: saveDispatch })}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-4"
      >
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
          <ContentTextarea
            name="main_text"
            defaultValue={info?.main_text ?? ''}
            rows={20}
            className={`${inputClass} font-mono`}
          />
        </div>

        <StatusSelect current={info?.status} publishedAt={info?.published_at} defaultStatus="PUBLISH" />

        <SubmitButton name="intent" value="save" pending={saving} pendingText="保存中...">
          保存
        </SubmitButton>
      </form>
    </div>
  )
}
