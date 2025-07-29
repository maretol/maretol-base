import { ParsedContent } from 'api-types'
import { RenderContext } from '../types'
import { JSX } from 'react'

export function renderUnknown(content: ParsedContent, context: RenderContext): JSX.Element {
  return (
    <div key={context.index}>
      <p>unknown tag error : {content.tag_name}</p>
      <div dangerouslySetInnerHTML={{ __html: content.inner_html || '' }} />
    </div>
  )
}
