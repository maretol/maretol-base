import { ParsedContent } from 'api-types'
import { ContentRenderer, RenderContext } from '../types'
import { JSX } from 'react'

export class HorizontalRuleRenderer implements ContentRenderer {
  canRender(content: ParsedContent): boolean {
    return content.tag_name === 'hr'
  }

  render(content: ParsedContent, context: RenderContext): JSX.Element {
    return (
      <div key={context.index} className="py-6">
        <hr className="border-gray-500" />
      </div>
    )
  }
}
