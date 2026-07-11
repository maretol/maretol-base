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
