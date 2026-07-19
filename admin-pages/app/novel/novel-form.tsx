'use client'

import { useActionState, useState } from 'react'
import type { novelRow, novelTagRow, novelSeriesRow } from 'api-types'
import type { NovelRef } from '@/lib/db_novel'
import { createNovelAction, updateNovelAction, previewNovelAction } from './actions'
import { SubmitButton } from '@/components/submit-button'

type Props = {
  mode: 'new' | 'edit'
  novel?: novelRow
  allTags: novelTagRow[]
  allSeries: novelSeriesRow[]
  allNovels: NovelRef[]
  error?: string
  saved?: boolean
  info?: string
}

// ISO 8601 UTC の日時を date input 用の JST 日付（YYYY-MM-DD）に変換する
function toJSTDateValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const jst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(0, 10)
}

export function NovelForm({ mode, novel, allTags, allSeries, allNovels, error, saved, info }: Props) {
  const action = mode === 'new' ? createNovelAction : updateNovelAction
  // プレビューはページ遷移させず結果だけ受け取る（遷移すると編集中の本文が消えるため）
  const [preview, previewFormAction] = useActionState(previewNovelAction, {})
  const inputClass = 'mt-1 w-full rounded-md border border-gray-300 p-2 text-sm'
  const monoClass = `${inputClass} font-mono`

  // 前後の巻は同一シリーズ内でのみ設定できる（comicと同じ制約）ため、
  // シリーズと前後の巻のセレクトを連動させる（シリーズ変更時は前後の選択をクリア）
  const [seriesId, setSeriesId] = useState(novel?.series_id ?? '')
  const [previousId, setPreviousId] = useState(novel?.previous_id ?? '')
  const [nextId, setNextId] = useState(novel?.next_id ?? '')
  const seriesNovels = seriesId === '' ? [] : allNovels.filter((n) => n.series_id === seriesId && n.id !== novel?.id)

  return (
    <div className="space-y-4">
      {saved && <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">保存しました</p>}
      {info && <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">自動連携: {info}</p>}
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">ID（URLの一部。空欄でランダム生成。作成後変更不可）</label>
            {mode === 'new' ? (
              <input name="id" placeholder="例: the_first_novel" className={monoClass} />
            ) : (
              <>
                <input type="hidden" name="id" value={novel?.id} />
                <p className="mt-1 font-mono text-sm text-gray-500">{novel?.id}</p>
              </>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium">タイトル *</label>
            <input name="title_name" defaultValue={novel?.title_name ?? ''} required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium">発行日</label>
            <input
              name="publish_date"
              type="date"
              defaultValue={toJSTDateValue(novel?.publish_date)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">発行イベント</label>
            <input name="publish_event" defaultValue={novel?.publish_event ?? ''} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">本文テキストURL *（プレーンテキスト）</label>
            <input
              name="contents_url"
              type="url"
              defaultValue={novel?.contents_url ?? ''}
              required
              placeholder="https://novel.maretol.xyz/.../body.txt"
              className={monoClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">タグ *</label>
            <select name="tag_id" defaultValue={novel?.tag_id ?? ''} required className={inputClass}>
              <option value="" disabled>
                選択してください
              </option>
              {allTags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tag_name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              追加は <a href="/novel/tags" className="underline">タグ管理</a> から
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium">シリーズ</label>
            <select
              name="series_id"
              value={seriesId}
              onChange={(e) => {
                setSeriesId(e.target.value)
                // 前後の巻は同一シリーズ内でのみ有効なため、シリーズを変えたら選択をクリアする
                setPreviousId('')
                setNextId('')
              }}
              className={inputClass}
            >
              <option value="">なし</option>
              {allSeries.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.series_name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              追加は <a href="/novel/series" className="underline">シリーズ管理</a> から
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium">前の巻（previous_id）</label>
            <select
              name="previous_id"
              value={previousId}
              onChange={(e) => setPreviousId(e.target.value)}
              disabled={seriesId === ''}
              className={inputClass}
            >
              <option value="">なし</option>
              {seriesNovels.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title_name}（{n.id}）
                </option>
              ))}
              {previousId !== '' && !seriesNovels.some((n) => n.id === previousId) && (
                <option value={previousId}>{previousId}（シリーズ外・要修正）</option>
              )}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              {seriesId === '' ? 'シリーズを選択すると設定できます' : '保存時に相手側の「次の巻」も自動設定されます'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium">次の巻（next_id）</label>
            <select
              name="next_id"
              value={nextId}
              onChange={(e) => setNextId(e.target.value)}
              disabled={seriesId === ''}
              className={inputClass}
            >
              <option value="">なし</option>
              {seriesNovels.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title_name}（{n.id}）
                </option>
              ))}
              {nextId !== '' && !seriesNovels.some((n) => n.id === nextId) && (
                <option value={nextId}>{nextId}（シリーズ外・要修正）</option>
              )}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              {seriesId === '' ? 'シリーズを選択すると設定できます' : '保存時に相手側の「前の巻」も自動設定されます'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium">表紙ファイル名（cover。OGP用・任意）</label>
            <input name="cover" defaultValue={novel?.cover ?? ''} placeholder="cover_001.png" className={monoClass} />
          </div>
          <div>
            <label className="block text-sm font-medium">公開状態</label>
            <select name="status" defaultValue={novel?.status ?? 'DRAFT'} className={inputClass}>
              <option value="PUBLISH">公開</option>
              <option value="DRAFT">下書き</option>
              <option value="CLOSED">非公開</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3">
            <label className="block text-sm font-medium">説明文</label>
            <select
              name="description_format"
              defaultValue={novel?.description_format ?? 'markdown'}
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
            defaultValue={novel?.description ?? ''}
            rows={14}
            className={`${monoClass} w-full`}
          />
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
    </div>
  )
}
