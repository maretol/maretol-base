import { ParsedContent } from 'api-types'
import { ContentRenderer, RenderContext } from '../types'
import { JSX } from 'react'

export class ListRenderer implements ContentRenderer {
  canRender(content: ParsedContent): boolean {
    return content.tag_name === 'ul' || content.tag_name === 'ol'
  }

  render(content: ParsedContent, context: RenderContext): JSX.Element {
    const ListTag = content.tag_name as 'ul' | 'ol'

    return (
      <ListTag key={context.index} dangerouslySetInnerHTML={{ __html: content.inner_html || '' }} className="py-4" />
    )
  }
}
