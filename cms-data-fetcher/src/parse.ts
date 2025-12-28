import { load, type CheerioAPI } from 'cheerio'
import type { Element } from 'domhandler'
import { ParsedContent, TableOfContents } from 'api-types'

/**
 * インラインマークアップのパラメータ型
 */
type InlineParams = {
  baseText: string
  params: Record<string, string>
}

/**
 * インラインマークアップのハンドラー定義
 * 将来の拡張用インターフェース
 */
type InlineMarkupHandler = (baseText: string, value: string) => string

/**
 * サポートするインラインマークアップのハンドラーマップ
 */
const inlineMarkupHandlers: Record<string, InlineMarkupHandler> = {
  ruby: (baseText, reading) => `<ruby>${baseText}<rp>(</rp><rt>${reading}</rt><rp>)</rp></ruby>`,
}

/**
 * インラインマークアップのテキストからパラメータを抽出
 * @param text span 要素内のテキスト（例: "漢字@@ruby::かんじ"）
 * @returns ベーステキストとパラメータのオブジェクト
 */
export function parseInlineParams(text: string): InlineParams {
  const parts = text.split('@@')
  const baseText = parts[0]
  const params: Record<string, string> = {}

  if (parts.length > 1) {
    const paramParts = parts.slice(1)
    paramParts.forEach((part) => {
      if (part.includes('::')) {
        const [key, value] = part.split('::')
        if (key && value !== undefined) {
          params[key] = value
        }
      }
    })
  }

  return { baseText, params }
}

/**
 * inline-markup クラスを持つ span 要素を対応する HTML 要素に変換する
 * @param $ Cheerio インスタンス
 * @param element 変換対象の要素
 */
export function transformInlineMarkup($: CheerioAPI, element: Element): void {
  $(element)
    .find('span.inline-markup')
    .each((_, span) => {
      const text = $(span).text()
      const { baseText, params } = parseInlineParams(text)

      // ハンドラーマップから対応するハンドラーを探す
      for (const [key, handler] of Object.entries(inlineMarkupHandlers)) {
        if (params[key] !== undefined) {
          const transformed = handler(baseText, params[key])
          $(span).replaceWith(transformed)
          return // 最初にマッチしたハンドラーで変換して終了
        }
      }
      // マッチするハンドラーがない場合は何もしない（span をそのまま保持）
    })
}

export function parse(content: string) {
  const $ = load(content)

  const toc: TableOfContents = []

  const details = $('body > *').map((index, element) => {
    const tagName = element.tagName
    const attrs = element.attribs
    // text と p_option 判定は変換前のテキストに対して実行
    const raw_text = $(element).text()
    const text = getText(raw_text)
    const pOpt = tagName === 'p' ? getPOption(text) : null
    const sub_texts = getSubText(raw_text)

    // インラインマークアップ変換を inner_html 取得前に適用
    if ($(element).find('span.inline-markup').length > 0) {
      transformInlineMarkup($, element)
    }
    const innerHTML = $(element).html()

    // 目次の対象（ <span class="index"> )がある場合、目次の配列に対象を追加
    // 目次タイトルにはルビを含まない親文字のみを使用（text は変換前から取得済み）
    if ($(element).find('span.index').length > 0) {
      toc.push({
        id: $(element).attr('id') || '',
        title: text,
        level: parseInt(tagName.slice(-1)),
      })
    }

    return {
      index,
      tag_name: tagName,
      class: $(element).attr('class') || '',
      attributes: attrs,
      inner_html: innerHTML,
      text,
      sub_texts,
      p_option: pOpt,
    } as ParsedContent
  })

  return { contents_array: details.toArray(), table_of_contents: toc }
}

function getPOption(text: string) {
  // URLではない場合
  if (!URL.canParse(text)) {
    if (text === '') {
      return 'empty'
    } else if (isCommand(text)) {
      const mainText = getText(text)
      return mainText.replaceAll('/', '')
    }
    return 'normal'
  }

  // URLの場合
  const textURL = new URL(text)
  if (isImage(textURL.hostname, text)) {
    return 'image'
  } else if (isPhoto(textURL.hostname, text)) {
    return 'photo'
  } else if (isMySite(textURL.hostname, textURL.pathname)) {
    return 'my_site'
  } else if (isComicPage(textURL.hostname, textURL.pathname)) {
    return 'comic'
  } else if (isIllustDetail(textURL.hostname, textURL.pathname)) {
    return 'illust_detail'
  } else if (isYouTube(textURL.hostname)) {
    return 'youtube'
  } else if (isTwitter(textURL.hostname)) {
    return 'twitter'
  } else if (isAmazon(textURL.hostname)) {
    return 'amazon'
  } else if (isBlog(textURL.hostname, textURL.pathname)) {
    return 'blog'
  } else if (isArtifact(textURL.hostname, textURL.pathname)) {
    return 'artifact'
  } else if (isURL(textURL)) {
    return 'url'
  } else {
    // URLとしてパースできたが、http/https以外のプロトコルの場合は通常のテキストとして扱う
    return 'normal'
  }
}

// トップページ、/blog, /illust, /comics, /about, /cotact などの特定のパスに完全に一致する場合
function isMySite(hostname: string, pathname: string) {
  const mySiteDomain = ['maretol.xyz', 'www.maretol.xyz']
  if (!mySiteDomain.includes(hostname)) {
    return false
  }
  pathname = pathname.endsWith('/') ? pathname : pathname + '/'
  const mySitePaths = ['/', '/blog/', '/illust/', '/comics/', '/about/', '/contact/']
  if (mySitePaths.includes(pathname)) {
    return true
  }
}

function isImage(hostname: string, text: string) {
  if (hostname === 'r2.maretol.xyz') {
    const ext = text.split('.').pop() || ''
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
      return true
    }
    return false
  }
}

function isPhoto(hostname: string, text: string) {
  const photoDomain = ['photos.maretol.xyz', 'capture.maretol.xyz']
  if (photoDomain.includes(hostname)) {
    const photoURL = text.split('@@')[0] // 画像URL。@@以降はタイトルやキャプション
    const ext = photoURL.split('.').pop() || ''
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
      return true
    }
  }
  return false
}

function isComicPage(hostname: string, pathname: string) {
  const comicDomain = ['maretol.xyz', 'www.maretol.xyz']
  return comicDomain.includes(hostname) && pathname.indexOf('/comics/') === 0
}

function isYouTube(hostname: string) {
  return ['youtu.be', 'www.youtube.com'].includes(hostname)
}

function isTwitter(hostname: string) {
  return ['twitter.com', 'www.twitter.com', 'x.com'].includes(hostname)
}

function isAmazon(hostname: string) {
  return ['www.amazon.co.jp', 'amzn.to'].includes(hostname)
}

// ブログ記事のリンクの場合
function isBlog(hostname: string, pathname: string) {
  return ['maretol.xyz', 'www.maretol.xyz'].includes(hostname) && pathname.indexOf('/blog/') === 0
}

// artifactのリンクの場合
function isArtifact(hostname: string, pathname: string) {
  return ['maretol.xyz', 'www.maretol.xyz'].includes(hostname) && pathname.indexOf('/artifacts/') === 0
}

function isIllustDetail(hostname: string, pathname: string) {
  return ['maretol.xyz', 'www.maretol.xyz'].includes(hostname) && pathname.indexOf('/illust/detail') === 0
}

function isURL(url: URL) {
  return url.protocol === 'http:' || url.protocol === 'https:'
}

function isCommand(text: string) {
  return text.indexOf('/') === 0
}

// サブテキストが付与されている場合、本文のみを返す
function getText(text: string) {
  if (text.split('@@').length > 1) {
    return text.split('@@')[0]
  }
  return text
}

// サブテキストのフォーマットは [main text]@@[subtext_key1]::[subtext1_value]@@[subtext_key2]::[subtext2_value] とする
// 上記のフォーマットをパースして key: value の形を返す。main text は返さない
function getSubText(text: string) {
  if (text.split('@@').length > 1) {
    const subText = text.split('@@').slice(1)
    const subTextObj: { [key: string]: string } = {}
    subText.forEach((sub) => {
      const [key, value] = sub.split('::')
      subTextObj[key] = value
    })
    return subTextObj
  }
  return null
}

export { getPOption }
