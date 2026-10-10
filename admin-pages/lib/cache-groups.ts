/**
 * キャッシュ管理ページの手動パージのグループ
 * 保存時の自動パージで賄えないケース（保存時のパージの失敗・D1直接編集後・カテゴリ改名後・不整合時など）のためのもの
 *
 * 定義だけを置き、サーバー専用の処理は持たない（クライアントコンポーネントからも読むため）。パージの処理は lib/cache.ts
 */
import { manualPurgeTags } from 'cache-tags'

// edgeTags は、公開サイト（pages-astro）の Workers Cache でパージするタグ（astro_design.md 4.3）
export const CACHE_GROUPS = {
  illust: {
    label: 'イラスト（一覧・単体）',
    edgeTags: manualPurgeTags.illust(),
  },
  comic: {
    label: 'マンガ（一覧・単体）',
    edgeTags: manualPurgeTags.comic(),
  },
  blog: {
    label: 'ブログ（一覧・タグ絞り込み・記事単体）',
    edgeTags: manualPurgeTags.blog(),
  },
  blog_meta: {
    label: 'ブログメタ（tags / info / static）',
    edgeTags: manualPurgeTags.blogMeta(),
  },
} as const

export type CacheGroupKey = keyof typeof CACHE_GROUPS
