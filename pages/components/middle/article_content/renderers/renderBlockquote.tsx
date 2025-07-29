import { ParsedContent } from 'api-types'
import { RenderContext } from '../types'
import Blockquote from '../../article_dom/blockquote'
import { JSX } from 'react'

export function renderBlockquote(content: ParsedContent, context: RenderContext): JSX.Element {
  return <Blockquote key={context.index} innerHTML={content.inner_html || ''} text={content.text} />
}
