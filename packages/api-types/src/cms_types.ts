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

type contentsAPIResult = {
  id: string
  createdAt: string
  updatedAt: string
  publishedAt: string
  revisedAt: string
  title: string
  content: string
  parsed_content: ParsedContent[]
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
  main_text: string
  parsed_content: ParsedContent[]
}

export type { RequestJSONType, ParsedContent, contentsAPIResult, categoryAPIResult, infoAPIResult }
