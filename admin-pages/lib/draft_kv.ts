/**
 * KVプレビュー（CMS_DRAFT）の共通処理。サービスごとに違うのはキーの接頭辞・公開サイトのパス・レコードの本体だけなので、
 * それらを draftChannel の設定で受け取り、レコードの本体の組み立ては draft.ts / draft_blog.ts / draft_comic.ts が持つ
 *
 * KV は「公開サイトでプレビューするためのチャネル」で、下書きの正本は D1（cms_goal.md）。TTL は D1 の状態で決める（#1404）
 * - D1 に下書き（PUBLISH 以外）の行がある間は失効させない（TTL なし）。下書き保存のたびに同じ内容で上書きされる
 * - D1 に行が無い（新規）か PUBLISH の行に対する、保存していない内容のプレビューは 3 日で失効する
 * - PUBLISH で保存したら削除する（公開内容と違う古いプレビューを残さない）
 * - draftKey は「プレビュー URL を発行」のたびに新しくする（前の URL は無効になる）。保存の同期は既存のキーを保つ
 * レコードには preview（TTL なしか、保存していない内容か）を持たせ、編集ページの既存プレビューの説明に使う
 */
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { draftPreviewMeta } from 'api-types'
import type { ContentStatus } from './status'
import type { DraftSyncResult, ExistingPreviewInfo } from './form-state'
import { generateDraftKey } from './id'

export const DRAFT_TTL_SECONDS = 3 * 24 * 60 * 60

// 各サービスのレコードに共通する部分。本体（row やタグ）はサービスごと（api-types の *DraftRecord）
export type DraftRecordBase = { draftKey: string; preview?: draftPreviewMeta }

// #1404 より前の管理ページが書いたレコードには preview が無い。すべて保存前プレビュー（3 日の TTL）だった
const LEGACY_PREVIEW: draftPreviewMeta = { persistent: false, unsaved: true }

async function getKV(): Promise<KVNamespace> {
  const { env } = await getCloudflareContext({ async: true })
  return env.CMS_DRAFT
}

// 公開サイト（pages-astro）の URL
async function pagesURL(path: string): Promise<string> {
  const { env } = await getCloudflareContext({ async: true })
  return `${env.PAGES_HOST}${path}`
}

type ChannelConfig<Input, Current, Body> = {
  kvPrefix: string
  // 公開サイトのパス。プレビューは draftKey を付ける（pages-astro が読んで fetcher に渡す）
  pagePath: (id: string) => string
  // 編集中の内容と保存前の行（新規は null）から、レコードの本体（draftKey と preview 以外）を組み立てる
  buildRecord: (input: Input, current: Current | null) => Promise<Body>
}

export function draftChannel<
  Input extends { id: string; status: ContentStatus },
  Current extends { status: ContentStatus },
  Body extends object
>({ kvPrefix, pagePath, buildRecord }: ChannelConfig<Input, Current, Body>) {
  const kvKey = (id: string) => `${kvPrefix}${id}`
  const previewURL = (id: string, draftKey: string) => pagesURL(`${pagePath(id)}?draftKey=${draftKey}`)

  async function getRecord(id: string): Promise<DraftRecordBase | null> {
    const kv = await getKV()
    return kv.get<DraftRecordBase>(kvKey(id), 'json')
  }

  // 編集中の内容を KV に書き、プレビュー URL を返す。発行（unsaved）は新しい draftKey、保存の同期は既存のキーを保つ
  async function write(input: Input, current: Current | null, preview: draftPreviewMeta) {
    // draftKey の解決と本体の組み立て（タグなどの読み取り）は独立しているので並行する
    const [draftKey, body] = await Promise.all([
      preview.unsaved ? generateDraftKey() : getRecord(input.id).then((r) => r?.draftKey ?? generateDraftKey()),
      buildRecord(input, current),
    ])
    const record: DraftRecordBase & Body = { draftKey, preview, ...body }
    const kv = await getKV()
    await kv.put(
      kvKey(input.id),
      JSON.stringify(record),
      preview.persistent ? undefined : { expirationTtl: DRAFT_TTL_SECONDS }
    )
    return previewURL(input.id, draftKey)
  }

  return {
    // 「プレビュー URL を発行」。D1 には保存しない。D1 に下書きの行がある間は失効させず、新規・公開済みに対するものは 3 日で失効する
    async issuePreview(input: Input, current: Current | null): Promise<{ previewURL: string; persistent: boolean }> {
      const persistent = current !== null && current.status !== 'PUBLISH'
      return { previewURL: await write(input, current, { persistent, unsaved: true }), persistent }
    },
    // D1 への保存後の同期。下書き（PUBLISH 以外）なら同じ内容で TTL なしに書いてプレビュー URL を返し、
    // 公開なら古いプレビューを消して公開 URL を返す
    async syncAfterSave(input: Input, current: Current | null): Promise<DraftSyncResult> {
      if (input.status === 'PUBLISH') {
        const kv = await getKV()
        await kv.delete(kvKey(input.id))
        return { publicURL: await pagesURL(pagePath(input.id)) }
      }
      return { previewURL: await write(input, current, { persistent: true, unsaved: false }) }
    },
    // 編集ページで、KV に残っているプレビューを表示するために読む。無ければ null
    async getExistingPreview(id: string): Promise<ExistingPreviewInfo | null> {
      const record = await getRecord(id)
      if (record === null) {
        return null
      }
      return { previewURL: await previewURL(id, record.draftKey), ...(record.preview ?? LEGACY_PREVIEW) }
    },
  }
}
