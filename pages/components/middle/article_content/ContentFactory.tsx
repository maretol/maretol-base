import { ParsedContent } from 'api-types'
import { ContentRenderer, RenderContext } from './types'
import { HeadingRenderer } from './renderers/HeadingRenderer'
import { HorizontalRuleRenderer } from './renderers/HorizontalRuleRenderer'
import { TableRenderer } from './renderers/TableRenderer'
import { DivRenderer } from './renderers/DivRenderer'
import { ListRenderer } from './renderers/ListRenderer'
import { BlockquoteRenderer } from './renderers/BlockquoteRenderer'
import { ParagraphRenderer } from './renderers/ParagraphRenderer'
import { UnknownRenderer } from './renderers/UnknownRenderer'
import { JSX } from 'react'

export class ContentFactory {
  private renderers: ContentRenderer[]

  constructor() {
    this.renderers = [
      new HeadingRenderer(),
      new HorizontalRuleRenderer(),
      new TableRenderer(),
      new DivRenderer(),
      new ListRenderer(),
      new BlockquoteRenderer(),
      new ParagraphRenderer(),
    ]
  }

  render(content: ParsedContent, context: RenderContext): JSX.Element | null {
    const renderer = this.renderers.find((r) => r.canRender(content))

    if (renderer) {
      return renderer.render(content, context)
    }

    return new UnknownRenderer().render(content, context)
  }
}
