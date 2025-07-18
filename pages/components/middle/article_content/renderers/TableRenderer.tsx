import { ParsedContent } from 'api-types'
import { ContentRenderer, RenderContext } from '../types'
import { JSX } from 'react'

export class TableRenderer implements ContentRenderer {
  canRender(content: ParsedContent): boolean {
    return content.tag_name === 'table'
  }

  render(content: ParsedContent, context: RenderContext): JSX.Element | null {
    if (content.inner_html) {
      return <table key={context.index} dangerouslySetInnerHTML={{ __html: content.inner_html }} />
    }
    return null
  }
}
