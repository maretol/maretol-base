import { ParsedContent } from 'api-types'
import { RenderContext } from '../types'
import { JSX } from 'react'

export function renderTable(content: ParsedContent, context: RenderContext): JSX.Element | null {
  if (content.inner_html) {
    return (
      <div className="my-4 overflow-x-auto" key={context.index}>
        <table lang="ja" dangerouslySetInnerHTML={{ __html: content.inner_html }} />
      </div>
    )
  }
  return null
}
