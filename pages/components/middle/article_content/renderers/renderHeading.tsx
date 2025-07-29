import { ParsedContent } from 'api-types'
import { RenderContext } from '../types'
import Hn from '../../article_dom/h'
import { JSX } from 'react'

export function renderHeading(content: ParsedContent, context: RenderContext): JSX.Element {
  return <Hn key={context.index} tag={content.tag_name} text={content.text} attrs={content.attributes} />
}
