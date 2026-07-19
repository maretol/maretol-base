'use client'

import { useActionState, useState } from 'react'
import type { bandeDessineeRow, bandeDessineeTagRow, bandeDessineeSeriesRow } from 'api-types'
import type { BandeDessineeRef } from '@/lib/db_comic'
import { createBandeDessineeAction, updateBandeDessineeAction, previewBandeDessineeAction } from './actions'
import { SubmitButton } from '@/components/submit-button'

type Props = {
  mode: 'new' | 'edit'
  comic?: bandeDessineeRow
  allTags: bandeDessineeTagRow[]
  allSeries: bandeDessineeSeriesRow[]
  allComics: BandeDessineeRef[]
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

export function ComicForm({ mode, comic, allTags, allSeries, allComics, error, saved, info }: Props) {
  const action = mode === 'new' ? createBandeDessineeAction : updateBandeDessineeAction
  // プレビューはページ遷移させず結果だけ受け取る（遷移すると編集中の本文が消えるため）
  const [preview, previewFormAction] = useActionState(previewBandeDessineeAction, {})
  const inputClass = 'mt-1 w-full rounded-md border border-gray-300 p-2 text-sm'
  const monoClass = `${inputClass} font-mono`

  // 前後の巻は同一シリーズ内でのみ設定できる（issue #1155）ため、
  // シリーズと前後の巻のセレクトを連動させる（シリーズ変更時は前後の選択をクリア）
  const [seriesId, setSeriesId] = useState(comic?.series_id ?? '')
  const [previousId, setPreviousId] = useState(comic?.previous_id ?? '')
  const [nextId, setNextId] = useState(comic?.next_id ?? '')
  const seriesComics = seriesId === '' ? [] : allComics.filter((c) => c.series_id === seriesId && c.id !== comic?.id)

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
              <input name="id" placeholder="例: the_merged_wind_has_come" className={monoClass} />
            ) : (
              <>
                <input type="hidden" name="id" value={comic?.id} />
                <p className="mt-1 font-mono text-sm text-gray-500">{comic?.id}</p>
              </>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium">タイトル *</label>
            <input name="title_name" defaultValue={comic?.title_name ?? ''} required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium">発行日</label>
            <input
              name="publish_date"
              type="date"
              defaultValue={toJSTDateValue(comic?.publish_date)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">発行イベント</label>
            <input name="publish_event" defaultValue={comic?.publish_event ?? ''} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">コンテンツURL *（index.json）</label>
            <input
              name="contents_url"
              type="url"
              defaultValue={comic?.contents_url ?? ''}
              required
              placeholder="https://bande-dessinee.maretol.xyz/.../index.json"
              className={monoClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">タグ *</label>
            <select name="tag_id" defaultValue={comic?.tag_id ?? ''} required className={inputClass}>
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
              追加は <a href="/comic/tags" className="underline">タグ管理</a> から
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
              追加は <a href="/comic/series" className="underline">シリーズ管理</a> から
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
              {seriesComics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title_name}（{c.id}）
                </option>
              ))}
              {previousId !== '' && !seriesComics.some((c) => c.id === previousId) && (
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
              {seriesComics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title_name}（{c.id}）
                </option>
              ))}
              {nextId !== '' && !seriesComics.some((c) => c.id === nextId) && (
                <option value={nextId}>{nextId}（シリーズ外・要修正）</option>
              )}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              {seriesId === '' ? 'シリーズを選択すると設定できます' : '保存時に相手側の「前の巻」も自動設定されます'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium">表紙ファイル名（cover）</label>
            <input name="cover" defaultValue={comic?.cover ?? ''} placeholder="test_001.png" className={monoClass} />
          </div>
          <div>
            <label className="block text-sm font-medium">裏表紙ファイル名（back_cover）</label>
            <input name="back_cover" defaultValue={comic?.back_cover ?? ''} className={monoClass} />
          </div>
          <div>
            <label className="block text-sm font-medium">ページファイル名の接頭辞（filename）*</label>
            <input name="filename" defaultValue={comic?.filename ?? ''} required className={monoClass} />
          </div>
          <div>
            <label className="block text-sm font-medium">画像形式（format、カンマ区切り）</label>
            <input
              name="format"
              defaultValue={comic ? (JSON.parse(comic.format) as string[]).join(', ') : 'png'}
              className={monoClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">開始ページ番号（first_page）*</label>
            <input
              name="first_page"
              type="number"
              defaultValue={comic?.first_page ?? 1}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">終了ページ番号（last_page）*</label>
            <input
              name="last_page"
              type="number"
              defaultValue={comic?.last_page ?? 1}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">1ページ目の開き（first_left_right）</label>
            <select
              name="first_left_right"
              defaultValue={comic ? ((JSON.parse(comic.first_left_right) as string[])[0] ?? 'left') : 'left'}
              className={inputClass}
            >
              <option value="left">left（左開き）</option>
              <option value="right">right（右開き）</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">公開状態</label>
            <select name="status" defaultValue={comic?.status ?? 'DRAFT'} className={inputClass}>
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
              defaultValue={comic?.description_format ?? 'markdown'}
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
            defaultValue={comic?.description ?? ''}
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
