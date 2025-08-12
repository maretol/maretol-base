import { ParsedContent, TableOfContents } from 'api-types'

export interface RenderContext {
  articleID: string
  index: number
  draftKey?: string
  sample?: boolean
  tableOfContents?: TableOfContents
}

export type POptionType =
  | 'normal'
  | 'image'
  | 'photo'
  | 'youtube'
  | 'twitter'
  | 'amazon'
  | 'url'
  | 'blog'
  | 'illust_detail'
  | 'artifact'
  | 'comic'
  | 'empty'
  | 'table_of_contents'
  | 'block_start'
  | 'block_end'

export interface ArticleContentProps {
  contents: ParsedContent[]
  articleID: string
  sample?: boolean
  draftKey?: string
  tableOfContents?: TableOfContents
}
