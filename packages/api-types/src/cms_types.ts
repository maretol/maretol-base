type RequestJSONType = {
  cms_content: string
}

type Annotation = {
  number: number
  text: string
}

type ParsedContent = {
  index: number
  tag_name: string
  class: string
  attributes: { [name: string]: string }
  inner_html?: string
  raw_text: string
  text: string
  sub_texts?: { [key: string]: string }
  p_option?: string
}

type TableOfContents = {
  id: string
  title: string
  level: number
}[]

type contentsAPIResult = {
  id: string
  createdAt: string
  updatedAt: string
  publishedAt: string
  revisedAt: string
  title: string
  content: string
  parsed_content: ParsedContent[]
  table_of_contents: TableOfContents
  ogp_image?: string
  categories: categoryAPIResult[]
  annotations?: Annotation[]
  // 限定公開フラグ。true の場合は一覧に表示しない（記事閲覧のゲートは別途対応）
  // secret_code は秘匿情報のためクライアントへ渡る型には含めない（サーバ側でのみ扱う）
  is_secret?: boolean
}

// 記事下部の前後記事ナビ用。prev = 一つ前（古い方）、next = 一つあと（新しい方）
// 限定公開記事は一覧系と同様にナビに含めない
type adjacentArticle = {
  id: string
  title: string
}

type adjacentContentsResult = {
  prev: adjacentArticle | null
  next: adjacentArticle | null
}

type categoryAPIResult = {
  id: string
  createdAt: string
  updatedAt: string
  publishedAt: string
  revisedAt: string
  name: string
}

type infoAPIResult = {
  id: string
  createdAt: string
  updatedAt: string
  publishedAt: string
  revisedAt: string
  page_pathname: string
  title?: string
  main_text: string
  parsed_content: ParsedContent[]
  table_of_contents: TableOfContents
  annotations?: Annotation[]
}

type staticAPIResult = {
  createdAt: string
  updatedAt: string
  publishedAt: string
  revisedAt: string
  sidebar_about: string
  sidebar_profile: string
}

type bandeDessineeResult = {
  id: string
  createdAt: string
  updatedAt: string
  publishedAt: string
  title_name: string
  publish_date?: string
  publish_event?: string
  contents_url: string
  description: string
  next_id?: string
  previous_id?: string
  series?: bandeDessineeSerires
  tag: bandeDessineeTag
  cover?: string
  back_cover?: string
  format: string[]
  filename: string
  first_page: number
  last_page: number
  first_left_right: ('right' | 'left')[]
  parsed_description: ParsedContent[]
  table_of_contents: TableOfContents
  annotations?: Annotation[]
}

type bandeDessineeSerires = {
  id: string
  series_name: string
}

type bandeDessineeTag = {
  id: string
  tag_name: string
}

// 小説（novel）コンテンツのメタ情報。
// comic（bandeDessineeResult）から画像系フィールド（back_cover/format/filename/first_page/last_page/first_left_right）を除外し、
// テキスト小説向けに再定義したもの。本文テキスト自体は contents_url が指す外部プレーンテキストファイルとして配信する。
type novelResult = {
  id: string
  createdAt: string
  updatedAt: string
  publishedAt: string
  title_name: string
  publish_date?: string
  publish_event?: string
  contents_url: string // 外部プレーンテキスト本文への参照
  description: string // CMS リッチテキスト（メタ説明）
  next_id?: string
  previous_id?: string
  series?: novelSeries
  tag: novelTag
  cover?: string // OGP 用の任意表紙。無ければ既定 OGP にフォールバックする
  parsed_description: ParsedContent[]
  table_of_contents: TableOfContents
  annotations?: Annotation[]
}

type novelSeries = {
  id: string
  series_name: string
}

type novelTag = {
  id: string
  tag_name: string
}

type atelierResult = {
  id: string
  title: string
  src: string
  description: string
  parsed_description: ParsedContent[]
  tag_or_category: atelierTagAndCategory[]
  table_of_contents: TableOfContents
  annotations?: Annotation[]
  object_position: string // "left" | "right" | "top" | "bottom" | "center"
  createdAt: string
  updatedAt: string
  publishedAt: string
  revisedAt: string
}

type atelierTagAndCategory = {
  id: string
  tag: string
  type: string[] // キャラクター、（二次創作元の）作品などが一つ指定される。配列だが最初の要素だけ見れば良い
  createdAt: string
  updatedAt: string
  publishedAt: string
  revisedAt: string
}

export type {
  RequestJSONType,
  ParsedContent,
  TableOfContents,
  Annotation,
  contentsAPIResult,
  adjacentContentsResult,
  categoryAPIResult,
  infoAPIResult,
  staticAPIResult,
  bandeDessineeResult,
  novelResult,
  novelSeries,
  novelTag,
  atelierResult,
  atelierTagAndCategory,
}
