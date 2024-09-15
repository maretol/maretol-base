import { load } from 'cheerio'
import { ParsedContent } from 'api-types'

export function parse(content: string) {
  const $ = load(content)

  const details = $('body > *').map((index, element) => {
    const tagName = element.tagName
    const attrs = element.attribs
    const text = $(element).text()
    const innerHTML = $(element).html()
    const pOpt = tagName === 'p' ? getPOption(text) : null
    return {
      index,
      tag_name: tagName,
      class: $(element).attr('class') || '',
      attributes: attrs,
      inner_html: innerHTML,
      text,
      p_option: pOpt,
    } as ParsedContent
  })

  return details.toArray()
}

function getPOption(text: string) {
  let pOpt = 'normal'
  if (isImage(text)) {
    pOpt = 'image'
  } else if (isComic(text)) {
    // 現状選べない。そのうち実装してなんとかする
    pOpt = 'comic'
  } else if (isYouTube(text)) {
    pOpt = 'youtube'
  } else if (isTwitter(text)) {
    pOpt = 'twitter'
  } else if (isURL(text)) {
    pOpt = 'url'
  } else if (text === '') {
    pOpt = 'empty'
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

function isComic(text: string) {
  return text.indexOf('content_comic:::') === 0
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

function isURL(text: string) {
  return text.indexOf('https://') === 0
}
