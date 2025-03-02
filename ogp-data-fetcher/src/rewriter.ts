export class GetMetadataRewriter {
  private rewriter: HTMLRewriter
  private metaElementParams: Map<string, string>

  constructor() {
    this.rewriter = new HTMLRewriter()
    this.metaElementParams = new Map()
  }

  public setRewiterHandler(selector: string, handler: (element: Element) => void) {
    this.rewriter.on(selector, {
      element: (element) => {
        handler(element)
      },
    })
  }

  public setCharsetHandler() {
    this.rewriter.on('meta', {
      element: (element) => {
        const httpEquiv = element.getAttribute('http-equiv')
        if (httpEquiv === 'Content-Type' || httpEquiv === 'content-type') {
          const content = element.getAttribute('content')
          const charset = content
            ?.replaceAll(' ', '')
            ?.split(';')
            .find((v) => v.includes('charset'))
            ?.split('=')[1]
          if (charset !== undefined) {
            this.metaElementParams.set('charset', charset)
          }
        } else if (element.getAttribute('charset') !== null) {
          const charset = element.getAttribute('charset')
          if (charset) {
            this.metaElementParams.set('charset', charset)
          }
        }
      },
    })
  }

  public async execute(html: string) {
    const response = new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
    })

    return this.rewriter.transform(response).text()
  }

  public getCharset() {
    return this.metaElementParams.get('charset')?.toLowerCase()
  }
}
