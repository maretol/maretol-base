import { contentsAPIResult } from 'api-types'

export function filterTags(firstTagContents: contentsAPIResult[], tagIDs: string[]) {
  return firstTagContents.filter((content) => {
    return content.categories.some((tag) => tagIDs.includes(tag.id))
  })
}
