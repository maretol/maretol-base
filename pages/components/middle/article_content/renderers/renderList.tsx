import { ParsedContent } from 'api-types'
import { RenderContext } from '../types'
import { JSX } from 'react'

export function renderList(content: ParsedContent, context: RenderContext): JSX.Element {
  const ListTag = content.tag_name as 'ul' | 'ol'

  return <ListTag key={context.index} dangerouslySetInnerHTML={{ __html: content.inner_html || '' }} className="py-4" />
}
