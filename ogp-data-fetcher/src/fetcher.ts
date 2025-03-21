import { GetMetadataRewriter } from './rewriter'

export async function fetchAndGetHTMLText(target: string): Promise<{ title: string; text: string }> {
  const result = await fetch(target, { headers: { 'User-Agent': 'bot' } })

  if (!result.ok) {
    throw new Error(`Failed to fetch: ${result.statusText}`)
  }

  // http response header の charset でエンコーディングを取得する
  const contentType = result.headers.get('content-type')
  const headerCharset = contentType
    ?.replaceAll(' ', '')
    ?.split(';')
    .find((v) => v.split('=')[0] === 'charset')
    ?.split('=')[1]

  if (headerCharset) {
    // header に charset が指定されている場合。それに従ってデコードする
    const buffer = await result.arrayBuffer()
    const decoder = new TextDecoder(headerCharset)
    const decodedText = decoder.decode(buffer)

    const htmlRewriter = new GetMetadataRewriter()
    htmlRewriter.setCharsetHandler()
    await htmlRewriter.execute(decodedText)
    const title = htmlRewriter.getTitle() || 'No Page Title'

    return { title, text: decodedText }
  } else {
    // undefinedだった場合、UTF-8 もしくは html の header に指定されている場合がある
    // まず buffer を取得して保存したうえで、textでデコードし header を分析する
    const decoder = new TextDecoder()
    const buffer = await result.arrayBuffer()
    const text = decoder.decode(buffer)

    // htmlrewriterでhtml要素を解析し、header->meta->charsetを取得する
    const htmlRewriter = new GetMetadataRewriter()
    htmlRewriter.setCharsetHandler()
    await htmlRewriter.execute(text)
    const metaCharset = htmlRewriter.getCharset()
    const title = htmlRewriter.getTitle() || 'no title'

    // 特に指定がないまたは UTF-8 指定の場合
    // text がそのまま UTF-8 のときのHTML要素なのでそのままで良い
    if (metaCharset === undefined || metaCharset === 'utf-8') {
      return { title, text }
    } else {
      // metaタグの charset の指定に従ってデコードして返す
      const decoder = new TextDecoder(metaCharset)
      const decodedText = decoder.decode(buffer)
      return { title, text: decodedText }
    }
  }
}
