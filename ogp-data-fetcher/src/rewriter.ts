import { decodeHTML } from 'entities'
import { parseCharsetParam } from './charset'

export class GetMetadataRewriter {
  private rewriter: HTMLRewriter
  private metaElementParams: Map<string, string>
  // <head> 内の最初の <title> の本文。テキストはチャンクに分かれて届くので、末尾まで溜めてから title にする
  private titleChunks: string[]
  private titleCount: number

  constructor() {
    this.rewriter = new HTMLRewriter()
    this.metaElementParams = new Map()
    this.titleChunks = []
    this.titleCount = 0
  }

  public setRewiterHandler(selector: string, handler: (element: Element) => void) {
    this.rewriter.on(selector, {
      element: (element) => {
        handler(element)
      },
    })
  }

  public setCharsetHandler() {
    this.rewriter
      .on('meta', {
        element: (element) => {
          const httpEquiv = element.getAttribute('http-equiv')
          if (httpEquiv?.toLowerCase() === 'content-type') {
            const charset = parseCharsetParam(element.getAttribute('content'))
            if (charset !== undefined) {
              this.metaElementParams.set('charset', charset)
            }
          } else {
            const charset = element.getAttribute('charset')
            if (charset) {
              this.metaElementParams.set('charset', charset.toLowerCase())
            }
          }
        },
      })
      // body 内の <svg><title> で上書きされないよう <head> 直下に限る
      .on('head > title', {
        element: () => {
          this.titleCount += 1
        },
        text: (text) => {
          if (this.titleCount !== 1) return
          this.titleChunks.push(text.text)
          if (text.lastInTextNode) {
            // HTMLRewriter のテキストはソースのままなので、&amp; などの実体参照を戻す
            const title = decodeHTML(this.titleChunks.join('')).trim()
            if (title !== '') {
              this.metaElementParams.set('title', title)
            }
          }
        },
      })
  }

  public async execute(html: string) {
    this.titleChunks = []
    this.titleCount = 0
    const response = new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
    })

    return this.rewriter.transform(response).text()
  }

  public getCharset() {
    return this.metaElementParams.get('charset')
  }

  public getTitle() {
    return this.metaElementParams.get('title')
  }
}
