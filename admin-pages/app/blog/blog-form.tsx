'use client'

import { useActionState } from 'react'
import type { blogContentRow, blogCategoryRow } from 'api-types'
import {
  createBlogContentAction,
  updateBlogContentAction,
  previewBlogContentAction,
  addBlogCategoryInlineAction,
} from './actions'
import { SubmitButton } from '@/components/submit-button'
import { ContentTextarea } from '@/components/content-textarea'

type Props = {
  mode: 'new' | 'edit'
  article?: blogContentRow
  selectedCategoryIDs?: string[]
  allCategories: blogCategoryRow[]
  error?: string
  saved?: boolean
}

export function BlogForm({ mode, article, selectedCategoryIDs = [], allCategories, error, saved }: Props) {
  const action = mode === 'new' ? createBlogContentAction : updateBlogContentAction
  // プレビューはページ遷移させず結果だけ受け取る（遷移すると編集中の本文が消えるため）
  const [preview, previewFormAction] = useActionState(previewBlogContentAction, {})
  // カテゴリのインライン追加もページ遷移させない。追加分は累積されチェック済みで表示する
  const [added, addCategoryFormAction, addingCategory] = useActionState(addBlogCategoryInlineAction, {
    categories: [],
  })
  const addedCategories = added.categories.filter((c) => !allCategories.some((a) => a.id === c.id))
  const inputClass = 'mt-1 w-full rounded-md border border-gray-300 p-2 text-sm'

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
          <label className="block text-sm font-medium">ID（URLの一部。空欄でランダム生成。作成後変更不可）</label>
          {mode === 'new' ? (
            <input name="id" className={`${inputClass} font-mono`} />
          ) : (
            <>
              <input type="hidden" name="id" value={article?.id} />
              <p className="mt-1 font-mono text-sm text-gray-500">{article?.id}</p>
            </>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">タイトル *</label>
          <input name="title" defaultValue={article?.title ?? ''} required className={inputClass} />
        </div>

        <div>
          <div className="flex items-center gap-3">
            <label className="block text-sm font-medium">本文（独自記法は cms_doc.md 参照）</label>
            <select
              name="content_format"
              defaultValue={article?.content_format ?? 'markdown'}
              className="rounded-md border border-gray-300 p-1 text-xs"
            >
              <option value="markdown">Markdown</option>
              <option value="html">HTML（旧CMS形式）</option>
            </select>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            形式を変更しても本文は自動変換されません。切り替える場合は本文の書き直しとセットで保存してください
          </p>
          <ContentTextarea
            name="content"
            defaultValue={article?.content ?? ''}
            rows={24}
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">カテゴリ</label>
          <div className="mt-1 flex flex-wrap gap-3">
            {allCategories.map((c) => (
              <label key={c.id} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  name="category_ids"
                  value={c.id}
                  defaultChecked={selectedCategoryIDs.includes(c.id)}
                />
                {c.name}
              </label>
            ))}
            {addedCategories.map((c) => (
              <label key={c.id} className="flex items-center gap-1 text-sm">
                {/* インライン追加した直後のカテゴリはチェック済みで表示する */}
                <input type="checkbox" name="category_ids" value={c.id} defaultChecked />
                {c.name} <span className="text-xs text-green-600">（追加済み）</span>
              </label>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            {/* form属性で本文フォームの外にある追加専用フォームに紐づける（フォームのネスト回避） */}
            <input
              form="add-category-form"
              name="new_category_name"
              placeholder="新しいカテゴリ名"
              className="w-64 rounded-md border border-gray-300 p-1.5 text-sm"
            />
            <button
              type="submit"
              form="add-category-form"
              disabled={addingCategory}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addingCategory ? '追加中...' : 'カテゴリ追加'}
            </button>
            {added.error && <span className="text-xs text-red-700">{added.error}</span>}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            IDの指定や表示順の変更は{' '}
            <a href="/blog/categories" target="_blank" rel="noopener noreferrer" className="underline">
              カテゴリ管理
            </a>{' '}
            から（新しいタブで開きます）
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">OGP画像URL</label>
            <input
              name="ogp_image"
              type="url"
              defaultValue={article?.ogp_image ?? ''}
              placeholder="https://r2.maretol.xyz/..."
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">SNS投稿文（sns_text。公開時の自動投稿に使用）</label>
            <input name="sns_text" defaultValue={article?.sns_text ?? ''} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-md border border-gray-100 bg-gray-50 p-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_secret" defaultChecked={article?.is_secret === 1} />
            限定公開（一覧に表示せず、シークレットコードを知っている人だけ閲覧可能。SNS自動投稿の対象外）
          </label>
          <div>
            <label className="block text-sm font-medium">シークレットコード</label>
            <input
              name="secret_code"
              defaultValue={article?.secret_code ?? ''}
              className={`${inputClass} font-mono`}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">公開状態</label>
          <select name="status" defaultValue={article?.status ?? 'DRAFT'} className="mt-1 rounded-md border border-gray-300 p-2 text-sm">
            <option value="PUBLISH">公開</option>
            <option value="DRAFT">下書き</option>
            <option value="CLOSED">非公開</option>
          </select>
          <p className="mt-1 text-xs text-gray-400">
            新規公開・下書き→公開のときにSNS自動投稿が送信されます（限定公開は対象外）
          </p>
        </div>

        <div className="space-y-2 border-t border-gray-100 pt-4">
          <div className="flex gap-3">
            <SubmitButton pendingText="保存中...">保存</SubmitButton>
            <SubmitButton variant="secondary" formAction={previewFormAction} pendingText="プレビュー保存中...">
              プレビュー保存（D1には保存しない）
            </SubmitButton>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-500">
            <input type="checkbox" name="regenerate_draft_key" />
            プレビューURL（draftKey）を再生成する（未チェックなら既存のプレビューURLのまま内容だけ更新されます）
          </label>
        </div>
      </form>

      {/* カテゴリ追加用フォームの実体。本文フォームとネストできないため外に置き、form属性で参照する */}
      <form id="add-category-form" action={addCategoryFormAction} />
    </div>
  )
}
