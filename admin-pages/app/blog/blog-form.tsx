'use client'

import { useActionState, useState } from 'react'
import type { blogContentRow, blogCategoryRow } from 'api-types'
import {
  createBlogContentAction,
  updateBlogContentAction,
  previewBlogContentAction,
  addBlogCategoryInlineAction,
} from './actions'
import type { ExistingPreviewInfo, SaveActionState } from '@/lib/form-state'
import { submitByIntent } from '@/lib/form-submit'
import { SubmitButton } from '@/components/submit-button'
import { ContentTextarea } from '@/components/content-textarea'
import { PurgeFailedNotice } from '@/components/purge-failed-notice'
import { SaveResult } from '@/components/save-result'
import { ExistingPreview, PreviewResult } from '@/components/preview-result'
import { StatusSelect } from '@/components/status-select'

type Props = {
  mode: 'new' | 'edit'
  article?: blogContentRow
  selectedCategoryIDs?: string[]
  allCategories: blogCategoryRow[]
  // 新規作成から遷移してきたときの結果（作成した・パージに失敗した）。編集ページが URL のクエリから組み立てる
  initialState?: SaveActionState
  // KV に残っているプレビュー（編集ページが読む）
  existingPreview?: ExistingPreviewInfo | null
}

export function BlogForm({
  mode,
  article,
  selectedCategoryIDs = [],
  allCategories,
  initialState = {},
  existingPreview = null,
}: Props) {
  // 保存はページ遷移させず結果を state で受け取る（遷移すると編集中の本文が消えるため）。
  // 新規作成だけは action 内で作成した記事の編集画面へ遷移する（URL が変わるため）
  const [save, saveDispatch, saving] = useActionState(
    mode === 'new' ? createBlogContentAction : updateBlogContentAction,
    initialState,
  )
  const [preview, previewDispatch, previewing] = useActionState(previewBlogContentAction, {})
  // カテゴリのインライン追加もページ遷移させない。追加分は累積されチェック済みで表示する
  const [added, addCategoryFormAction, addingCategory] = useActionState(addBlogCategoryInlineAction, {
    categories: [],
  })
  // 新規作成で ID を空のままプレビュー URL を発行したとき、サーバーが生成した ID を ID 欄に入れる（保存時も同じ ID になる）。
  // key を変えて入力を作り直す（応答待ちの間は readOnly にして、作り直しで消える入力を受けない）。
  // 以後は利用者の入力を優先するので、生成済みの ID は覚えておく
  const [generatedID, setGeneratedID] = useState<string | undefined>(undefined)
  if (preview.generatedID && preview.generatedID !== generatedID) {
    setGeneratedID(preview.generatedID)
  }
  // どの操作の結果を表示するか（最後に実行した操作の結果だけを見せる）
  const [last, setLast] = useState<'save' | 'preview' | null>(null)
  const addedCategories = added.categories.filter((c) => !allCategories.some((a) => a.id === c.id))
  const inputClass = 'mt-1 w-full rounded-md border border-gray-300 p-2 text-sm'

  return (
    <div className="space-y-4">
      {/* 応答待ちの間は結果を出さない（前回の、別の操作の結果が最新の結果に見えるため） */}
      {!saving &&
        !previewing &&
        (last === 'preview' ? (
          <PreviewResult state={preview} />
        ) : (
          <SaveResult state={save} purgeHint="上の「この記事のキャッシュを削除」を実行してください" />
        ))}
      {last === null && existingPreview && <ExistingPreview preview={existingPreview} />}

      {/* 送信は submit イベントから自分で dispatch する（form action に渡すと完了後に入力が reset されるため。lib/form-submit.ts） */}
      <form
        onSubmit={(e) => setLast(submitByIntent(e, { save: saveDispatch, preview: previewDispatch }))}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="mode" value={mode} />

        <div>
          <label className="block text-sm font-medium">ID（URLの一部。空欄でランダム生成。作成後変更不可）</label>
          {mode === 'new' ? (
            <input
              name="id"
              key={generatedID ?? 'blank'}
              defaultValue={generatedID ?? ''}
              readOnly={previewing}
              className={`${inputClass} font-mono`}
            />
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
            {added.purgeFailed && <PurgeFailedNotice inline />}
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
            <input name="secret_code" defaultValue={article?.secret_code ?? ''} className={`${inputClass} font-mono`} />
          </div>
        </div>

        <StatusSelect current={article?.status}>
          <p className="mt-1 text-xs text-gray-400">
            初めて公開するときにSNS自動投稿が送信されます（限定公開は対象外。非公開から公開に戻しても送信されません）
          </p>
        </StatusSelect>

        <div className="space-y-2 border-t border-gray-100 pt-4">
          {/* カテゴリ追加中は送信しない。追加中に送ると、まだフォームに無い新カテゴリが抜けたまま保存される */}
          <div className="flex gap-3">
            <SubmitButton
              name="intent"
              value="save"
              pending={saving}
              disabled={previewing || addingCategory}
              pendingText="保存中..."
            >
              保存
            </SubmitButton>
            <SubmitButton
              name="intent"
              value="preview"
              variant="secondary"
              pending={previewing}
              disabled={saving || addingCategory}
              pendingText="発行中..."
            >
              プレビュー URL を発行（D1 には保存しない）
            </SubmitButton>
          </div>
          <p className="text-xs text-gray-500">
            下書き・非公開で保存すると、同じ内容のプレビュー URL が結果に出ます（公開で保存するまで失効しません）。
            「プレビュー URL を発行」は保存せずに今の内容を公開サイトで確認するためのもので、押すたびに新しい URL
            になります（前の URL は無効になります）
          </p>
        </div>
      </form>

      {/* カテゴリ追加用フォームの実体。本文フォームとネストできないため外に置き、form属性で参照する */}
      <form id="add-category-form" action={addCategoryFormAction} />
    </div>
  )
}
