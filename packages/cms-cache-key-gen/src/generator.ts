export function generateContentsKey(offset: string, limit: string) {
  return `contents_${offset}_${limit}`
}

export function generateContentKey(articleID: string) {
  return `content_${articleID}`
}

export function generateContentsWithTagsKey(tagIDs: string[], offset: string, limit: string) {
  tagIDs = tagIDs.sort()
  return `contents_with_tags_${tagIDs.join('_')}_${offset}_${limit}`
}

export function generateTagsKey() {
  return 'tags'
}

export function generateInfoKey() {
  return 'info'
}

export function generateStaticDataKey() {
  return 'static'
}

export function generateBandeDessineeKey(offset: string, limit: string) {
  return `bande_dessinee_${offset}_${limit}`
}

export function generateBandeDessineeContentKey(contentID: string) {
  return `bande_dessinee_content_${contentID}`
}

export function generateAtelierKey(offset: string, limit: string) {
  return `atelier_${offset}_${limit}`
}

export function generateAtelierContentKey(contentID: string) {
  return `atelier_content_${contentID}`
}
