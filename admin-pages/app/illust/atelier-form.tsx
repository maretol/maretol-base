'use client'

import { useActionState } from 'react'
import type { atelierRow, atelierTagRow } from 'api-types'
import { createAtelierAction, updateAtelierAction, previewAtelierAction } from './actions'

type Props = {
  mode: 'new' | 'edit'
  atelier?: atelierRow
  selectedTagIDs?: string[]
  allTags: atelierTagRow[]
  error?: string
  saved?: boolean
}

const positions = ['center', 'top', 'bottom', 'left', 'right']

export function AtelierForm({ mode, atelier, selectedTagIDs = [], allTags, error, saved }: Props) {
  const action = mode === 'new' ? createAtelierAction : updateAtelierAction
  // プレビューはページ遷移させず結果だけ受け取る（遷移すると編集中の本文が消えるため）
  const [preview, previewFormAction] = useActionState(previewAtelierAction, {})

  return (
    <div className="space-y-4">
      {saved && <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">保存しました</p>}
      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
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

      <form action={action} className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
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
          <textarea
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

        <div>
          <label className="block text-sm font-medium">公開状態</label>
          <select
            name="status"
            defaultValue={atelier?.status ?? 'DRAFT'}
            className="mt-1 rounded-md border border-gray-300 p-2 text-sm"
          >
            <option value="PUBLISH">公開</option>
            <option value="DRAFT">下書き</option>
            <option value="CLOSED">非公開</option>
          </select>
        </div>

        <div className="space-y-2 border-t border-gray-100 pt-4">
          <div className="flex gap-3">
            <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
              保存
            </button>
            <button
              type="submit"
              formAction={previewFormAction}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
            >
              プレビュー保存（D1には保存しない）
            </button>
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
