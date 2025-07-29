import { ParsedContent } from 'api-types'
import { RenderContext } from '../types'
import Div from '../../article_dom/div'
import { JSX } from 'react'

export function renderDiv(content: ParsedContent, context: RenderContext): JSX.Element | null {
  if (content.inner_html) {
    return <Div key={context.index} innerHTML={content.inner_html} attrs={content.attributes} />
  }
  return null
}
