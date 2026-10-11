/**
 * KVプレビュー（CMS_DRAFT）の共通処理。サービスごとのレコードの組み立ては draft.ts / draft_blog.ts / draft_comic.ts
 *
 * KV は「公開サイトでプレビューするためのチャネル」で、下書きの正本は D1（cms_goal.md）。TTL は D1 の状態で決める（#1404）
 * - D1 に下書き（PUBLISH 以外）の行がある間は失効させない（TTL なし）。下書き保存のたびに同じ内容で上書きされる
 * - D1 に行が無い（新規）か PUBLISH の行に対する、保存していない内容のプレビューは 3 日で失効する
 * - PUBLISH で保存したら削除する（公開内容と違う古いプレビューを残さない）
 */
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { generateDraftKey } from './id'

export const DRAFT_TTL_SECONDS = 3 * 24 * 60 * 60

export type DraftWriteOptions = {
  // 共有済みのプレビューURLを変えないよう既定では既存の draftKey を維持し、指定時だけ新しいキーにする
  regenerateKey: boolean
  // D1 に下書きの行がある（TTL を付けない）
  persistent: boolean
}

type DraftRecord = { draftKey: string }

async function getKV(): Promise<KVNamespace> {
  const { env } = await getCloudflareContext({ async: true })
  return env.CMS_DRAFT
}

// 既存レコードの draftKey。無ければ null
export async function getDraftKey(kvKey: string): Promise<string | null> {
  const kv = await getKV()
  const existing = await kv.get<DraftRecord>(kvKey, 'json')
  return existing?.draftKey ?? null
}

export async function resolveDraftKey(kvKey: string, regenerateKey: boolean): Promise<string> {
  if (regenerateKey) {
    return generateDraftKey()
  }
  return (await getDraftKey(kvKey)) ?? generateDraftKey()
}

export async function putDraft(kvKey: string, record: DraftRecord, persistent: boolean): Promise<void> {
  const kv = await getKV()
  await kv.put(kvKey, JSON.stringify(record), persistent ? undefined : { expirationTtl: DRAFT_TTL_SECONDS })
}

export async function deleteDraft(kvKey: string): Promise<void> {
  const kv = await getKV()
  await kv.delete(kvKey)
}

// 公開サイト（pages-astro）の URL。プレビューは draftKey を付ける（pages-astro が読んで fetcher に渡す）
export async function previewURL(path: string, draftKey: string): Promise<string> {
  const { env } = await getCloudflareContext({ async: true })
  return `${env.PAGES_HOST}${path}?draftKey=${draftKey}`
}

export async function publicURL(path: string): Promise<string> {
  const { env } = await getCloudflareContext({ async: true })
  return `${env.PAGES_HOST}${path}`
}
