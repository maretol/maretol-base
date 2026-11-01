import { ILLUST_LIST_PATH, ILLUST_LIST_TITLE } from '@/lib/illust'
import type { FeedChannel } from '@/lib/rss'
import { SITE_NAME } from '@/lib/site'

// RSS フィードの一覧。フィードのエンドポイント（pages/rss/*.rdf.ts）の channel、head の <link rel="alternate">
// （layouts/BaseLayout.astro）、ヘッダーの RSS メニュー（components/shell/HeaderButtons.astro）がここを参照する。
// フィードを足すときはここに 1 件足す（mw/query.ts の routes と mw/observe.ts の除外は別に足す）

export type FeedKind = 'blog' | 'comics' | 'illust'

export type Feed = {
  // フィードのパス
  path: string
  // channel の題名。<link rel="alternate"> の title にも使う
  title: string
  // channel の説明
  description: string
  // channel の link にする一覧ページのパス（ブログはトップ）
  listPath: string
  // メニューに出す名前。ヘッダーのボタンと同じ英語
  label: string
}

export const feeds: Record<FeedKind, Feed> = {
  blog: {
    path: '/rss/feed.rdf',
    title: SITE_NAME,
    description: 'maretolの個人サイトです',
    listPath: '',
    label: 'Blog',
  },
  comics: {
    path: '/rss/comics.rdf',
    title: `Comics | ${SITE_NAME}`,
    description: 'maretolの漫画の一覧です',
    listPath: '/comics',
    label: 'Comics',
  },
  illust: {
    path: '/rss/illust.rdf',
    title: ILLUST_LIST_TITLE,
    description: 'maretolのイラストの一覧です',
    listPath: ILLUST_LIST_PATH,
    label: 'Illustrations',
  },
}

// <link rel="alternate"> に出す順
export const feedList: Feed[] = [feeds.blog, feeds.comics, feeds.illust]

export function feedChannel(host: string, feed: Feed): FeedChannel {
  return { title: feed.title, link: `${host}${feed.listPath}`, description: feed.description }
}

// フィードの絶対 URL（<link rel="alternate"> と、メニューの URL コピー）
export function feedURL(host: string, feed: Feed): string {
  return `${host}${feed.path}`
}
