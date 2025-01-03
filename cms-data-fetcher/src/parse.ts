import { load } from 'cheerio'
import { ParsedContent, TableOfContents } from 'api-types'

export function parse(content: string) {
  const $ = load(content)

  const toc: TableOfContents = []

  const details = $('body > *').map((index, element) => {
    const tagName = element.tagName
    const attrs = element.attribs
    const raw_text = $(element).text()
    const text = getText(raw_text)
    const innerHTML = $(element).html()
    const pOpt = tagName === 'p' ? getPOption(text) : null
    const sub_texts = getSubText(raw_text)

    // 目次の対象（ <span class="index"> )がある場合、目次の配列に対象を追加
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
  let pOpt = 'normal'
  if (isImage(text)) {
    pOpt = 'image'
  } else if (isPhoto(text)) {
    pOpt = 'photo'
  } else if (isComicPage(text)) {
    pOpt = 'comic'
  } else if (isYouTube(text)) {
    pOpt = 'youtube'
  } else if (isTwitter(text)) {
    pOpt = 'twitter'
  } else if (isAmazon(text)) {
    pOpt = 'amazon'
  } else if (isBlog(text)) {
    pOpt = 'blog'
  } else if (isArtifact(text)) {
    pOpt = 'artifact'
  } else if (isURL(text)) {
    pOpt = 'url'
  } else if (text === '') {
    pOpt = 'empty'
  } else if (isCommand(text)) {
    pOpt = text.replaceAll('/', '')
  }
  return pOpt
}

function isImage(text: string) {
  if (text.indexOf('https://r2.maretol.xyz/') === 0) {
    const ext = text.split('.').pop() || ''
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
      return true
    }
    return false
  }
}

function isPhoto(text: string) {
  if (text.indexOf('https://photos.maretol.xyz') === 0) {
    const photoURL = text.split('@@')[0] // 画像URL。@@以降はキャプション
    const ext = photoURL.split('.').pop() || ''
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
      return true
    }
  }
  return
}

function isComicPage(text: string) {
  return text.indexOf('https://www.maretol.xyz/comics/') === 0 || text.indexOf('https://maretol.xyz/comics/') === 0
}

function isYouTube(text: string) {
  return text.indexOf('https://youtu.be/') === 0 || text.indexOf('https://www.youtube.com/') === 0
}

function isTwitter(text: string) {
  return (
    text.indexOf('https://twitter.com/') === 0 ||
    text.indexOf('https://www.twitter.com/') === 0 ||
    text.indexOf('https://x.com/') === 0
  )
}

function isAmazon(text: string) {
  return text.indexOf('https://www.amazon.co.jp/') === 0 || text.indexOf('https://amzn.to/') === 0
}

// ブログ記事のリンクの場合
function isBlog(text: string) {
  return text.indexOf('https://www.maretol.xyz/blog/') === 0 || text.indexOf('https://maretol.xyz/blog/') === 0
}

// artifactのリンクの場合
function isArtifact(text: string) {
  return (
    text.indexOf('https://www.maretol.xyz/artifacts/') === 0 || text.indexOf('https://maretol.xyz/artifacts/') === 0
  )
}

function isURL(text: string) {
  return text.indexOf('https://') === 0
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
