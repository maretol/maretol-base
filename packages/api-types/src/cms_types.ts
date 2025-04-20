type RequestJSONType = {
  cms_content: string
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
}

type bandeDessineeSerires = {
  id: string
  series_name: string
}

type bandeDessineeTag = {
  id: string
  tag_name: string
}

export type {
  RequestJSONType,
  ParsedContent,
  TableOfContents,
  contentsAPIResult,
  categoryAPIResult,
  infoAPIResult,
  bandeDessineeResult,
}
