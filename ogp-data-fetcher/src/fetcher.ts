import { GetMetadataRewriter } from './rewriter'
import { createTextDecoder, parseCharsetParam } from './charset'

// 取得先の HTML と <title>、リダイレクト後の URL（相対パスの解決に使う）
export async function fetchAndGetHTMLText(target: string): Promise<{ title: string; text: string; url: string }> {
  const result = await fetch(target, { headers: { 'User-Agent': 'bot' } })

  if (!result.ok) {
    throw new Error(`Failed to fetch: ${result.statusText}`)
  }

  // http response header の charset でエンコーディングを取得する
  const headerCharset = parseCharsetParam(result.headers.get('content-type'))
  const buffer = await result.arrayBuffer()

  if (headerCharset) {
    // header に charset が指定されている場合。それに従ってデコードする
    const decodedText = createTextDecoder(headerCharset).decode(buffer)

    const htmlRewriter = new GetMetadataRewriter()
    htmlRewriter.setCharsetHandler()
    await htmlRewriter.execute(decodedText)
    const title = htmlRewriter.getTitle() || 'No Page Title'

    return { title, text: decodedText, url: result.url }
  } else {
    // undefinedだった場合、UTF-8 もしくは html の header に指定されている場合がある
    // まず UTF-8 でデコードし header を分析する
    const text = new TextDecoder().decode(buffer)

    // htmlrewriterでhtml要素を解析し、header->meta->charsetを取得する
    const htmlRewriter = new GetMetadataRewriter()
    htmlRewriter.setCharsetHandler()
    await htmlRewriter.execute(text)
    const metaDecoder = createTextDecoder(htmlRewriter.getCharset())

    // 特に指定がないまたは UTF-8 指定（utf8 などの別名を含む）の場合
    // text がそのまま UTF-8 のときのHTML要素なのでそのままで良い
    if (metaDecoder.encoding === 'utf-8') {
      const title = htmlRewriter.getTitle() || 'No Page Title'
      return { title, text, url: result.url }
    } else {
      // metaタグの charset の指定に従ってデコードして返す
      // titleはデコードし直したものを再度取得する
      const decodedText = metaDecoder.decode(buffer)
      await htmlRewriter.execute(decodedText)
      const title = htmlRewriter.getTitle() || 'No Page Title'
      return { title, text: decodedText, url: result.url }
    }
  }
}
