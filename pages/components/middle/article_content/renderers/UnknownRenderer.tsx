import { ParsedContent } from 'api-types'
import { ContentRenderer, RenderContext } from '../types'
import { JSX } from 'react'

export class UnknownRenderer implements ContentRenderer {
  canRender(content: ParsedContent): boolean {
    return true
  }

  render(content: ParsedContent, context: RenderContext): JSX.Element {
    return (
      <div key={context.index}>
        <p>unknown tag error : {content.tag_name}</p>
        <div dangerouslySetInnerHTML={{ __html: content.inner_html || '' }} />
      </div>
    )
  }
}
