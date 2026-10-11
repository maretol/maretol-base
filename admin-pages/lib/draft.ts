/**
 * KVプレビュー（draftKey互換）の illust ドラフト保存処理
 * 編集中の内容を D1 レコードと同一形状で CMS_DRAFT に書き込み、
 * cms-data-fetcher が draftKey 付きリクエストで参照する（cms_goal.md 参照）。TTL の規則は draft_kv.ts
 */
import type { atelierDraftRecord, atelierRow } from 'api-types'
import { listTags } from './db'
import type { AtelierInput } from './db'
import type { DraftSyncResult } from './form-state'
import {
  deleteDraft,
  getDraftKey,
  previewURL,
  publicURL,
  putDraft,
  resolveDraftKey,
  type DraftWriteOptions,
} from './draft_kv'

const kvKey = (id: string) => `draft_atelier_${id}`
const pagePath = (id: string) => `/illust/detail/${id}`

// current は D1 の保存前の行（新規は null）。作成日時・初公開日時をプレビューに引き継ぐ
export async function saveAtelierDraft(
  input: AtelierInput,
  current: atelierRow | null,
  { regenerateKey, persistent }: DraftWriteOptions
): Promise<{ draftKey: string; previewURL: string }> {
  const now = new Date().toISOString()
  // draftKey の解決とタグの読み取りは独立しているので並行する
  const [draftKey, allTags] = await Promise.all([resolveDraftKey(kvKey(input.id), regenerateKey), listTags()])

  const row: atelierRow = {
    id: input.id,
    title: input.title,
    src: input.src,
    object_position: input.object_position,
    description: input.description,
    // フォームで選択された形式でプレビューする（形式変更もプレビューで確認できるようにする）
    description_format: input.description_format,
    status: input.status,
    created_at: current?.created_at ?? now,
    updated_at: now,
    published_at: current?.published_at ?? now,
    revised_at: now,
  }

  // 配信時のタグ表示に必要な情報を埋め込む（fetcher側でのJOINを不要にする）
  const tags = input.tagIDs
    .map((id) => allTags.find((t) => t.id === id))
    .filter((t) => t !== undefined)
    .map((t) => ({
      id: t.id,
      tag: t.tag,
      type: [t.type],
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      publishedAt: t.published_at ?? t.created_at,
      revisedAt: t.revised_at ?? t.updated_at,
    }))

  const record: atelierDraftRecord = { draftKey, row, tags }
  await putDraft(kvKey(input.id), record, persistent)
  return { draftKey, previewURL: await previewURL(pagePath(input.id), draftKey) }
}

export async function deleteAtelierDraft(id: string): Promise<void> {
  await deleteDraft(kvKey(id))
}

// 編集ページで、すでに発行済みのプレビュー URL を表示するために読む。無ければ null
export async function getAtelierDraftPreviewURL(id: string): Promise<string | null> {
  const draftKey = await getDraftKey(kvKey(id))
  return draftKey === null ? null : await previewURL(pagePath(id), draftKey)
}

// D1 への保存後に KV を同期する。下書き（PUBLISH 以外）なら同じ内容で TTL なしに書いてプレビュー URL を返し、
// 公開なら古いプレビューを消して公開 URL を返す（#1404）
export async function syncAtelierDraftAfterSave(
  input: AtelierInput,
  current: atelierRow | null
): Promise<DraftSyncResult> {
  if (input.status === 'PUBLISH') {
    await deleteAtelierDraft(input.id)
    return { publicURL: await publicURL(pagePath(input.id)) }
  }
  const { previewURL } = await saveAtelierDraft(input, current, { regenerateKey: false, persistent: true })
  return { previewURL }
}
