// 内製CMS（D1: maretol-cms）の行型と、KVプレビューで受け渡すドラフトレコード型
// admin-pages（書き込み側）と cms-data-fetcher（配信側）で共有する

import type { atelierTagAndCategory } from './cms_types'

export type atelierRow = {
  id: string
  title: string
  src: string
  object_position: string
  description: string | null
  description_format: 'html' | 'markdown'
  status: 'PUBLISH' | 'DRAFT' | 'CLOSED'
  created_at: string
  updated_at: string
  published_at: string | null
  revised_at: string | null
}

export type atelierTagRow = {
  id: string
  tag: string
  type: string
  created_at: string
  updated_at: string
  published_at: string | null
  revised_at: string | null
}

// KVプレビュー（CMS_DRAFT）に保存するドラフトレコード
// キー: draft_atelier_{id} / 値: このJSON。draftKey の一致で閲覧可否を判定する
export type atelierDraftRecord = {
  draftKey: string
  row: atelierRow
  tags: atelierTagAndCategory[]
}

export type bandeDessineeRow = {
  id: string
  title_name: string
  publish_date: string | null
  publish_event: string | null
  contents_url: string
  next_id: string | null
  previous_id: string | null
  tag_id: string
  series_id: string | null
  cover: string | null
  back_cover: string | null
  format: string // JSON配列文字列 例: '["png"]'
  filename: string
  first_page: number
  last_page: number
  first_left_right: string // JSON配列文字列 例: '["left"]'
  description: string
  description_format: 'html' | 'markdown'
  status: 'PUBLISH' | 'DRAFT' | 'CLOSED'
  created_at: string
  updated_at: string
  published_at: string | null
  revised_at: string | null
}

export type bandeDessineeTagRow = {
  id: string
  tag_name: string
  created_at: string
  updated_at: string
  published_at: string | null
  revised_at: string | null
}

export type bandeDessineeSeriesRow = {
  id: string
  series_name: string
  created_at: string
  updated_at: string
  published_at: string | null
  revised_at: string | null
}

// キー: draft_bande_dessinee_{id}
export type bandeDessineeDraftRecord = {
  draftKey: string
  row: bandeDessineeRow
  tag: { id: string; tag_name: string }
  series: { id: string; series_name: string } | null
}

export type blogContentRow = {
  id: string
  title: string
  content: string
  content_format: 'html' | 'markdown'
  ogp_image: string | null
  sns_text: string | null
  is_secret: number // SQLiteのためboolean は 0/1
  secret_code: string | null
  status: 'PUBLISH' | 'DRAFT' | 'CLOSED'
  created_at: string
  updated_at: string
  published_at: string | null
  revised_at: string | null
}

export type blogCategoryRow = {
  id: string
  name: string
  sort_order: number
  created_at: string
  updated_at: string
  published_at: string | null
  revised_at: string | null
}

export type blogInfoRow = {
  id: string
  page_pathname: string
  title: string | null
  main_text: string
  main_text_format: 'html' | 'markdown'
  status: 'PUBLISH' | 'DRAFT' | 'CLOSED'
  created_at: string
  updated_at: string
  published_at: string | null
  revised_at: string | null
}

// キー: draft_blog_{id}
export type blogContentDraftRecord = {
  draftKey: string
  row: blogContentRow
  categories: blogCategoryRow[]
}
