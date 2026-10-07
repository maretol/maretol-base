/**
 * キャッシュ管理ページ（cms-cache-purger の運用機能の移行先）の手動パージのグループ
 * 保存時の自動パージで賄えないケース（D1直接編集後・カテゴリ改名後・不整合時など）のためのもの
 *
 * 定義だけを置き、サーバー専用の処理は持たない（クライアントコンポーネントからも読むため）。パージの処理は lib/cache.ts
 */
import { manualPurgeTags } from 'cache-tags'

export const ATELIER_PREFIX = 'atelier_'
export const BANDE_DESSINEE_PREFIX = 'bande_dessinee_'

// prefixes と keys は、KV（CMS_CACHE）で消すキー。
// edgeTags は、Astro 版の公開サイト（Workers Cache）でパージするタグ（astro_design.md 4.3）
export const CACHE_GROUPS = {
  illust: {
    label: 'イラスト（一覧・単体）',
    prefixes: [ATELIER_PREFIX],
    keys: [] as string[],
    edgeTags: manualPurgeTags.illust(),
  },
  comic: {
    label: 'マンガ（一覧・単体）',
    prefixes: [BANDE_DESSINEE_PREFIX],
    keys: [] as string[],
    edgeTags: manualPurgeTags.comic(),
  },
  // 一覧（contents_*）と記事単体（content_*）。公開サイトでは同じタグになるので、1 つのグループにしている
  blog: {
    label: 'ブログ（一覧・タグ絞り込み・記事単体）',
    prefixes: ['contents_', 'content_'],
    keys: [] as string[],
    edgeTags: manualPurgeTags.blog(),
  },
  blog_meta: {
    label: 'ブログメタ（tags / info / static）',
    prefixes: [] as string[],
    keys: ['tags', 'info', 'static'],
    edgeTags: manualPurgeTags.blogMeta(),
  },
} as const

export type CacheGroupKey = keyof typeof CACHE_GROUPS
