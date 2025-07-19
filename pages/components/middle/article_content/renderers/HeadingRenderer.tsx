import { ParsedContent } from 'api-types'
import { ContentRenderer, RenderContext } from '../types'
import Hn from '../../article_dom/h'
import { JSX } from 'react'

export class HeadingRenderer implements ContentRenderer {
  canRender(content: ParsedContent): boolean {
    return /h[1-5]/.test(content.tag_name)
  }

  render(content: ParsedContent, context: RenderContext): JSX.Element {
    return <Hn key={context.index} tag={content.tag_name} text={content.text} attrs={content.attributes} />
  }
}
