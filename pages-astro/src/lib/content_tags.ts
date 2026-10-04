import type { contentsAPIResult, ParsedContent } from 'api-types'
import { cacheTag } from 'cache-tags'
import { getSampleBlocks } from '@/lib/sample'

// 本文に埋め込んだカードが参照するコンテンツの Cache-Tag。
// 参照先が更新されたときに、カードを含むページもパージされるようにする。
// ブログカードは記事詳細が持つ list:blog で足りるので、ここでは扱わない
export function getEmbedTags(contents: ParsedContent[]): string[] {
  const tags = new Set<string>()
  for (const content of contents) {
    if (content.tag_name !== 'p') {
      continue
    }
    if (content.p_option === 'illust_detail') {
      // /illust/detail/{id}
      const id = pathSegment(content.text, 3)
      if (id) tags.add(cacheTag.illust(id))
    } else if (content.p_option === 'comic') {
      // /comics/{id}
      const id = pathSegment(content.text, 2)
      if (id) tags.add(cacheTag.comic(id))
    } else if (content.p_option === 'artifact') {
      tags.add(cacheTag.info)
    }
  }
  return [...tags]
}

// 一覧に抜粋を出す記事について、抜粋に含まれるカードの参照先のタグ
export function getSampleEmbedTags(articles: contentsAPIResult[]): string[] {
  return [...new Set(articles.flatMap((article) => getEmbedTags(getSampleBlocks(article.parsed_content))))]
}

function pathSegment(link: string, index: number): string | undefined {
  try {
    return new URL(link).pathname.split('/')[index] || undefined
  } catch {
    return undefined
  }
}
