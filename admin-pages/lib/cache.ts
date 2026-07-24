/**
 * pages の KV キャッシュ（CMS_CACHE）のパージ処理
 * cms-cache-purger と同等のロジックをCMS側に統合したもの（cms_goal.md 参照）
 * illust のキー（atelier_ プレフィックス: 一覧・単体とも）を一括削除する
 */
import { getCloudflareContext } from '@opennextjs/cloudflare'

const ATELIER_PREFIX = 'atelier_'
const BANDE_DESSINEE_PREFIX = 'bande_dessinee_'
// 一覧（novel_*）・単体メタ（novel_content_*）・本文（novel_body_*）すべて同一 prefix 体系（cms-cache-key-gen 参照）
const NOVEL_PREFIX = 'novel_'

export async function purgeAtelierCache(): Promise<void> {
  const { env } = await getCloudflareContext({ async: true })
  await deleteByPrefix(env.CMS_CACHE, ATELIER_PREFIX)
}

export async function purgeBandeDessineeCache(): Promise<void> {
  const { env } = await getCloudflareContext({ async: true })
  await deleteByPrefix(env.CMS_CACHE, BANDE_DESSINEE_PREFIX)
}

export async function purgeNovelCache(): Promise<void> {
  const { env } = await getCloudflareContext({ async: true })
  await deleteByPrefix(env.CMS_CACHE, NOVEL_PREFIX)
}

// blog記事の保存時: 一覧（contents_* / contents_with_tags_*）と単体（content_{id}）を削除する
export async function purgeBlogContentCache(articleID: string): Promise<void> {
  const { env } = await getCloudflareContext({ async: true })
  await Promise.all([deleteByPrefix(env.CMS_CACHE, 'contents_'), env.CMS_CACHE.delete(`content_${articleID}`)])
}

// カテゴリ・固定ページ・静的文言の保存時: 対応する固定キーを削除する
export async function purgeBlogMetaCache(key: 'tags' | 'info' | 'static'): Promise<void> {
  const { env } = await getCloudflareContext({ async: true })
  await env.CMS_CACHE.delete(key)
}

// --- キャッシュ管理ページ（cms-cache-purger の運用機能の移行先） ---
// 保存時の自動パージで賄えないケース（D1直接編集後・カテゴリ改名後・不整合時など）のための手動パージ

export const CACHE_GROUPS = {
  illust: { label: 'イラスト（一覧・単体）', prefixes: [ATELIER_PREFIX], keys: [] as string[] },
  comic: { label: 'マンガ（一覧・単体）', prefixes: [BANDE_DESSINEE_PREFIX], keys: [] as string[] },
  novel: { label: '小説（一覧・単体・本文）', prefixes: [NOVEL_PREFIX], keys: [] as string[] },
  blog_list: { label: 'ブログ一覧・タグ絞り込み', prefixes: ['contents_'], keys: [] as string[] },
  blog_content: { label: 'ブログ記事単体', prefixes: ['content_'], keys: [] as string[] },
  blog_meta: { label: 'ブログメタ（tags / info / static）', prefixes: [] as string[], keys: ['tags', 'info', 'static'] },
} as const

export type CacheGroupKey = keyof typeof CACHE_GROUPS

// グループごとのキャッシュ済みキー数を数える
export async function getCacheStats(): Promise<Record<CacheGroupKey, number>> {
  const { env } = await getCloudflareContext({ async: true })
  const stats = {} as Record<CacheGroupKey, number>
  for (const [group, def] of Object.entries(CACHE_GROUPS) as [CacheGroupKey, (typeof CACHE_GROUPS)[CacheGroupKey]][]) {
    let count = 0
    for (const prefix of def.prefixes) {
      count += await countByPrefix(env.CMS_CACHE, prefix)
    }
    for (const key of def.keys) {
      count += (await env.CMS_CACHE.get(key)) !== null ? 1 : 0
    }
    stats[group] = count
  }
  return stats
}

export async function purgeCacheGroup(group: CacheGroupKey): Promise<void> {
  const { env } = await getCloudflareContext({ async: true })
  const def = CACHE_GROUPS[group]
  for (const prefix of def.prefixes) {
    await deleteByPrefix(env.CMS_CACHE, prefix)
  }
  await Promise.all(def.keys.map((key) => env.CMS_CACHE.delete(key)))
}

export async function purgeAllCMSCache(): Promise<void> {
  for (const group of Object.keys(CACHE_GROUPS) as CacheGroupKey[]) {
    await purgeCacheGroup(group)
  }
}

async function countByPrefix(kv: KVNamespace, prefix: string): Promise<number> {
  let count = 0
  let cursor: string | undefined
  do {
    const list = await kv.list({ prefix, cursor })
    count += list.keys.length
    cursor = list.list_complete ? undefined : list.cursor
  } while (cursor !== undefined)
  return count
}

async function deleteByPrefix(kv: KVNamespace, prefix: string): Promise<void> {
  const list = await kv.list({ prefix })
  await Promise.all(list.keys.map((key) => kv.delete(key.name)))
  if (list.list_complete === false) {
    await deleteByPrefix(kv, prefix)
  }
}
