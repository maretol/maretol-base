import { ParsedContent } from 'api-types'
import { RenderContext } from '../types'
import { JSX } from 'react'

export function renderHorizontalRule(content: ParsedContent, context: RenderContext): JSX.Element {
  return <hr key={context.index} className="border-t-2 border-gray-300 my-8" />
}
