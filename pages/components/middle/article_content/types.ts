import { ParsedContent, TableOfContents } from 'api-types'
import { JSX } from 'react'

export interface RenderContext {
  articleID: string
  index: number
  sample?: boolean
  tableOfContents?: TableOfContents
}

export interface ContentRenderer {
  canRender(content: ParsedContent): boolean
  render(content: ParsedContent, context: RenderContext): JSX.Element | null
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
  tableOfContents?: TableOfContents
}
