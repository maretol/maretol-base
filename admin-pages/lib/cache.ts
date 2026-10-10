/**
 * admin の保存操作とキャッシュ管理ページからの、公開サイト（pages-astro）の Workers Cache のパージ処理
 *
 * - 保存操作ごとのタグは packages/cache-tags の purgeTags、キャッシュ管理ページのグループのタグは lib/cache-groups.ts（astro_design.md 4.3）
 * - 各関数の戻り値はパージできたか。失敗しても保存の失敗にはせず、遷移先の画面で知らせる（lib/purge_result.ts。astro_design.md 4.4）
 */
import { manualPurgeTags, purgeTags } from 'cache-tags'
import { CACHE_GROUPS, type CacheGroupKey } from './cache-groups'
import { purgeEdgeCache } from './edge_cache'

// イラストの保存時: そのイラストの詳細と、イラストの一覧を含むページ（トップ・サイドバーを持つページ・カードを含むページ）
export async function purgeAtelierCache(illustID: string): Promise<boolean> {
  return purgeEdgeCache(purgeTags.illust(illustID))
}

// 漫画の保存時: その漫画の詳細と、漫画の一覧を含むページ。
// 前後の巻の詳細（リンクが変わる）も list:comics を持つので、まとめてパージされる
export async function purgeBandeDessineeCache(comicID: string): Promise<boolean> {
  return purgeEdgeCache(purgeTags.comic(comicID))
}

// blog記事の保存時: その記事の詳細と、記事の一覧を含むページ（前後記事を表示する記事詳細を含む）
export async function purgeBlogContentCache(articleID: string): Promise<boolean> {
  return purgeEdgeCache(purgeTags.blogContent(articleID))
}

const blogMetaPurgeTags = {
  tags: purgeTags.blogTags,
  info: purgeTags.info,
  static: purgeTags.static,
}

// カテゴリ・固定ページ・静的文言の保存時
export async function purgeBlogMetaCache(key: keyof typeof blogMetaPurgeTags): Promise<boolean> {
  return purgeEdgeCache(blogMetaPurgeTags[key]())
}

// --- キャッシュ管理ページの手動パージ。グループの定義は lib/cache-groups.ts ---

export async function purgeCacheGroup(group: CacheGroupKey): Promise<boolean> {
  return purgeEdgeCache(CACHE_GROUPS[group].edgeTags)
}

// 全ページが持つタグで 1 回だけパージする（パージにはレート制限がある）
export async function purgeAllCache(): Promise<boolean> {
  return purgeEdgeCache(manualPurgeTags.all())
}
