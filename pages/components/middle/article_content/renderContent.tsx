import { ParsedContent } from 'api-types'
import { RenderContext } from './types'
import { renderHeading } from './renderers/renderHeading'
import { renderHorizontalRule } from './renderers/renderHorizontalRule'
import { renderTable } from './renderers/renderTable'
import { renderDiv } from './renderers/renderDiv'
import { renderList } from './renderers/renderList'
import { renderBlockquote } from './renderers/renderBlockquote'
import { renderParagraph } from './renderers/renderParagraph'
import { renderUnknown } from './renderers/renderUnknown'
import { JSX } from 'react'

type ContentRenderer = {
  canRender: (content: ParsedContent) => boolean
  render: (content: ParsedContent, context: RenderContext) => JSX.Element | null
}

const renderers: ContentRenderer[] = [
  {
    canRender: (content) => /h[1-5]/.test(content.tag_name),
    render: renderHeading,
  },
  {
    canRender: (content) => content.tag_name === 'hr',
    render: renderHorizontalRule,
  },
  {
    canRender: (content) => content.tag_name === 'table',
    render: renderTable,
  },
  {
    canRender: (content) => content.tag_name === 'div',
    render: renderDiv,
  },
  {
    canRender: (content) => content.tag_name === 'ul' || content.tag_name === 'ol',
    render: renderList,
  },
  {
    canRender: (content) => content.tag_name === 'blockquote',
    render: renderBlockquote,
  },
  {
    canRender: (content) => content.tag_name === 'p',
    render: renderParagraph,
  },
]

export default function renderContent(content: ParsedContent, context: RenderContext): JSX.Element | null {
  const renderer = renderers.find((r) => r.canRender(content))

  if (renderer) {
    return renderer.render(content, context)
  }

  return renderUnknown(content, context)
}
