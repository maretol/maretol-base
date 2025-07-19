import { ParsedContent } from 'api-types'
import { ContentRenderer, RenderContext } from '../types'
import Div from '../../article_dom/div'
import { JSX } from 'react'

export class DivRenderer implements ContentRenderer {
  canRender(content: ParsedContent): boolean {
    return content.tag_name === 'div'
  }

  render(content: ParsedContent, context: RenderContext): JSX.Element | null {
    if (content.inner_html) {
      return <Div key={context.index} innerHTML={content.inner_html} attrs={content.attributes} />
    }
    return null
  }
}
