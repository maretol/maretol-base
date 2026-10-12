'use client'

import { useActionState, useState } from 'react'
import type { bandeDessineeRow, bandeDessineeTagRow, bandeDessineeSeriesRow } from 'api-types'
import type { BandeDessineeRef } from '@/lib/db_comic'
import { createBandeDessineeAction, updateBandeDessineeAction, previewBandeDessineeAction } from './actions'
import type { ExistingPreviewInfo, SaveActionState } from '@/lib/form-state'
import { submitByIntent } from '@/lib/form-submit'
import { SubmitButton } from '@/components/submit-button'
import { ContentTextarea } from '@/components/content-textarea'
import { SaveResult } from '@/components/save-result'
import { ExistingPreview, PreviewResult } from '@/components/preview-result'
import { StatusSelect } from '@/components/status-select'

type Props = {
  mode: 'new' | 'edit'
  comic?: bandeDessineeRow
  allTags: bandeDessineeTagRow[]
  allSeries: bandeDessineeSeriesRow[]
  allComics: BandeDessineeRef[]
  // 新規作成から遷移してきたときの結果（作成した・前後巻の自動連携・パージに失敗した）。編集ページが URL のクエリから組み立てる
  initialState?: SaveActionState
  // KV に残っているプレビュー（編集ページが読む）
  existingPreview?: ExistingPreviewInfo | null
}

// ISO 8601 UTC の日時を date input 用の JST 日付（YYYY-MM-DD）に変換する
function toJSTDateValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const jst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(0, 10)
}

export function ComicForm({
  mode,
  comic,
  allTags,
  allSeries,
  allComics,
  initialState = {},
  existingPreview = null,
}: Props) {
  // 保存はページ遷移させず結果を state で受け取る（遷移すると編集中の本文が消えるため）。
  // 新規作成だけは action 内で作成したマンガの編集画面へ遷移する（URL が変わるため）
  const [save, saveDispatch, saving] = useActionState(
    mode === 'new' ? createBandeDessineeAction : updateBandeDessineeAction,
    initialState
  )
  const [preview, previewDispatch, previewing] = useActionState(previewBandeDessineeAction, {})
  // 新規作成で ID を空のままプレビュー URL を発行したとき、サーバーが生成した ID を ID 欄に入れる（保存時も同じ ID になる）。
  // key を変えて入力を作り直す（応答待ちの間は readOnly にして、作り直しで消える入力を受けない）。
  // 以後は利用者の入力を優先するので、生成済みの ID は覚えておく
  const [generatedID, setGeneratedID] = useState<string | undefined>(undefined)
  if (preview.generatedID && preview.generatedID !== generatedID) {
    setGeneratedID(preview.generatedID)
  }
  // どの操作の結果を表示するか（最後に実行した操作の結果だけを見せる）
  const [last, setLast] = useState<'save' | 'preview' | null>(null)
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
      {/* 応答待ちの間は結果を出さない（前回の、別の操作の結果が最新の結果に見えるため） */}
      {!saving &&
        !previewing &&
        (last === 'preview' ? (
          <PreviewResult state={preview} />
        ) : (
          <SaveResult state={save} purgeHint="上の「マンガのキャッシュを削除」を実行してください" />
        ))}
      {last === null && existingPreview && <ExistingPreview preview={existingPreview} />}

      {/* 送信は submit イベントから自分で dispatch する（form action に渡すと完了後に入力が reset されるため。lib/form-submit.ts） */}
      <form
        onSubmit={(e) => setLast(submitByIntent(e, { save: saveDispatch, preview: previewDispatch }))}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="mode" value={mode} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">ID（URLの一部。空欄でランダム生成。作成後変更不可）</label>
            {mode === 'new' ? (
              <input
                name="id"
                key={generatedID ?? 'blank'}
                defaultValue={generatedID ?? ''}
                readOnly={previewing}
                placeholder="例: the_merged_wind_has_come"
                className={monoClass}
              />
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
          <StatusSelect current={comic?.status} className={inputClass} />
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
          <ContentTextarea
            name="description"
            defaultValue={comic?.description ?? ''}
            rows={14}
            className={`${monoClass} w-full`}
          />
        </div>

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
    </div>
  )
}
