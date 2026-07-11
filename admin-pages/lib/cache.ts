/**
 * pages の KV キャッシュ（CMS_CACHE）のパージ処理
 * cms-cache-purger と同等のロジックをCMS側に統合したもの（cms_goal.md 参照）
 * illust のキー（atelier_ プレフィックス: 一覧・単体とも）を一括削除する
 */
import { getCloudflareContext } from '@opennextjs/cloudflare'

const ATELIER_PREFIX = 'atelier_'
const BANDE_DESSINEE_PREFIX = 'bande_dessinee_'

export async function purgeAtelierCache(): Promise<void> {
  const { env } = await getCloudflareContext({ async: true })
  await deleteByPrefix(env.CMS_CACHE, ATELIER_PREFIX)
}

export async function purgeBandeDessineeCache(): Promise<void> {
  const { env } = await getCloudflareContext({ async: true })
  await deleteByPrefix(env.CMS_CACHE, BANDE_DESSINEE_PREFIX)
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

async function deleteByPrefix(kv: KVNamespace, prefix: string): Promise<void> {
  const list = await kv.list({ prefix })
  await Promise.all(list.keys.map((key) => kv.delete(key.name)))
  if (list.list_complete === false) {
    await deleteByPrefix(kv, prefix)
  }
}
