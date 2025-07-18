import { ParsedContent } from 'api-types'
import { ContentRenderer, RenderContext } from '../types'
import Blockquote from '../../article_dom/blockquote'
import { JSX } from 'react'

export class BlockquoteRenderer implements ContentRenderer {
  canRender(content: ParsedContent): boolean {
    return content.tag_name === 'blockquote'
  }

  render(content: ParsedContent, context: RenderContext): JSX.Element {
    return <Blockquote key={context.index} innerHTML={content.inner_html || ''} text={content.text} />
  }
}
