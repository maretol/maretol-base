export default class GetMetadataRewriter {
  private rewriter: HTMLRewriter
  private nexessaryElementParams: Map<string, Map<string, string>>
  private metaElementParams: Map<string, string>

  constructor() {
    this.rewriter = new HTMLRewriter()
    this.nexessaryElementParams = new Map()
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

  public setNecessaryElement(selector: string) {
    this.rewriter.on(selector, {
      element: (element) => {
        const params = new Map<string, string>()
        for (const attr of element.attributes) {
          // attr は [name, value] の形らしい
          params.set(attr[0], attr[1])
        }
        this.nexessaryElementParams.set(selector, params)
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

  public getNecessaryElementParams(selector: string) {
    return this.nexessaryElementParams.get(selector)
  }

  public getCharset() {
    return this.metaElementParams.get('charset')?.toLowerCase()
  }
}
