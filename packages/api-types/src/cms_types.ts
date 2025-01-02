type RequestJSONType = {
  cms_content: string
}

type ParsedContent = {
  index: number
  tag_name: string
  class: string
  attributes: { [name: string]: string }
  inner_html: string | null
  raw_text: string
  text: string
  sub_texts: { [key: string]: string } | null
  p_option: string | null
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
  ogp_image: string | undefined | null
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
  title: string | undefined
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
  publish_date: string | null
  publish_event: string | null
  contents_url: string
  description: string
  next_id: string | null
  previous_id: string | null
  parsed_description: ParsedContent[]
  table_of_contents: TableOfContents
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
