import { ParsedContent } from 'api-types'
import { RenderContext } from '../types'
import { JSX } from 'react'

export function renderTable(content: ParsedContent, context: RenderContext): JSX.Element | null {
  if (content.inner_html) {
    return <table key={context.index} dangerouslySetInnerHTML={{ __html: content.inner_html }} />
  }
  return null
}
