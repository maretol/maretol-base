'use client'

import { useActionState } from 'react'
import type { atelierRow, atelierTagRow } from 'api-types'
import { createAtelierAction, updateAtelierAction, previewAtelierAction } from './actions'
import type { SaveActionState } from '@/lib/form-state'
import { submitByIntent } from '@/lib/form-submit'
import { SubmitButton } from '@/components/submit-button'
import { ContentTextarea } from '@/components/content-textarea'
import { SaveResult } from '@/components/save-result'
import { StatusSelect } from '@/components/status-select'

type Props = {
  mode: 'new' | 'edit'
  atelier?: atelierRow
  selectedTagIDs?: string[]
  allTags: atelierTagRow[]
  // 新規作成から遷移してきたときの結果（作成した・パージに失敗した）。編集ページが URL のクエリから組み立てる
  initialState?: SaveActionState
}

const positions = ['center', 'top', 'bottom', 'left', 'right']

export function AtelierForm({ mode, atelier, selectedTagIDs = [], allTags, initialState = {} }: Props) {
  // 保存はページ遷移させず結果を state で受け取る（遷移すると編集中の本文が消えるため）。
  // 新規作成だけは action 内で作成したイラストの編集画面へ遷移する（URL が変わるため）
  const [save, saveDispatch, saving] = useActionState(
    mode === 'new' ? createAtelierAction : updateAtelierAction,
    initialState
  )
  const [preview, previewDispatch, previewing] = useActionState(previewAtelierAction, {})

  return (
    <div className="space-y-4">
      <SaveResult state={save} purgeHint="上の「イラストのキャッシュを削除」を実行してください" />
      {preview.error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{preview.error}</p>
      )}
      {preview.previewURL && (
        <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          プレビューを保存しました:{' '}
          <a href={preview.previewURL} target="_blank" rel="noopener noreferrer" className="underline">
            {preview.previewURL}
          </a>
        </p>
      )}

      {/* 送信は submit イベントから自分で dispatch する（form action に渡すと完了後に入力が reset されるため。lib/form-submit.ts） */}
      <form
        onSubmit={(e) => submitByIntent(e, { save: saveDispatch, preview: previewDispatch })}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="mode" value={mode} />

        <div>
          <label className="block text-sm font-medium">
            ID（URLの一部になる。空欄でランダム生成。作成後は変更不可）
          </label>
          {mode === 'new' ? (
            <input
              name="id"
              defaultValue=""
              placeholder="例: teto"
              className="mt-1 w-full rounded-md border border-gray-300 p-2 font-mono text-sm"
            />
          ) : (
            <>
              <input type="hidden" name="id" value={atelier?.id} />
              <p className="mt-1 font-mono text-sm text-gray-500">{atelier?.id}</p>
            </>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">タイトル *</label>
          <input
            name="title"
            defaultValue={atelier?.title ?? ''}
            required
            className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">画像URL *（R2にアップロード済みの公開URL）</label>
          <input
            name="src"
            type="url"
            defaultValue={atelier?.src ?? ''}
            required
            placeholder="https://r2.maretol.xyz/..."
            className="mt-1 w-full rounded-md border border-gray-300 p-2 font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">サムネイル表示位置（object-position）</label>
          <select
            name="object_position"
            defaultValue={atelier?.object_position ?? 'center'}
            className="mt-1 rounded-md border border-gray-300 p-2 text-sm"
          >
            {positions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center gap-3">
            <label className="block text-sm font-medium">説明文</label>
            <select
              name="description_format"
              defaultValue={atelier?.description_format ?? 'markdown'}
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
            name="description"
            defaultValue={atelier?.description ?? ''}
            rows={12}
            className="mt-1 w-full rounded-md border border-gray-300 p-2 font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">タグ</label>
          <div className="mt-1 flex flex-wrap gap-3">
            {allTags.map((t) => (
              <label key={t.id} className="flex items-center gap-1 text-sm">
                <input type="checkbox" name="tag_ids" value={t.id} defaultChecked={selectedTagIDs.includes(t.id)} />
                {t.tag} <span className="text-xs text-gray-400">({t.type})</span>
              </label>
            ))}
            {allTags.length === 0 && <p className="text-sm text-gray-400">タグがありません</p>}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            タグの追加は <a href="/illust/tags" className="underline">タグ管理</a> から
          </p>
        </div>

        <StatusSelect current={atelier?.status} publishedAt={atelier?.published_at}>
          <p className="mt-1 text-xs text-gray-400">
            初めて公開するときにSNS自動投稿が送信されます（非公開から公開に戻しても送信されません）
          </p>
        </StatusSelect>

        <div className="space-y-2 border-t border-gray-100 pt-4">
          <div className="flex gap-3">
            <SubmitButton name="intent" value="save" pending={saving} disabled={previewing} pendingText="保存中...">
              保存
            </SubmitButton>
            <SubmitButton
              name="intent"
              value="preview"
              variant="secondary"
              pending={previewing}
              disabled={saving}
              pendingText="プレビュー保存中..."
            >
              プレビュー保存（D1には保存しない）
            </SubmitButton>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-500">
            <input type="checkbox" name="regenerate_draft_key" />
            プレビューURL（draftKey）を再生成する（未チェックなら既存のプレビューURLのまま内容だけ更新されます）
          </label>
        </div>
      </form>
    </div>
  )
}
