import type { ParsedContent } from 'api-types'
import { cacheTag } from 'cache-tags'

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

function pathSegment(link: string, index: number): string | undefined {
  try {
    return new URL(link).pathname.split('/')[index] || undefined
  } catch {
    return undefined
  }
}
