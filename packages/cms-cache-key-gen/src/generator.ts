export function generateContentsKey(offset: string, limit: string) {
  return `contents_${offset}_${limit}`
}

export function generateContentKey(articleID: string) {
  return `content_${articleID}`
}

export function generateAdjacentContentsKey(articleID: string) {
  return `adjacent_contents_${articleID}`
}

export function generateSecretMetaKey(articleID: string) {
  return `secret_meta_${articleID}`
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

export function generateNovelKey(offset: string, limit: string) {
  return `novel_${offset}_${limit}`
}

export function generateNovelContentKey(contentID: string) {
  return `novel_content_${contentID}`
}

// 小説本文（外部プレーンテキスト）専用のキャッシュキー。
// 一覧キー（novel_）と同一 prefix 体系のため、prefix 一括削除時に本文キャッシュも追従して削除される。
export function generateNovelBodyKey(contentID: string) {
  return `novel_body_${contentID}`
}

export function generateAtelierKey(offset: string, limit: string) {
  return `atelier_${offset}_${limit}`
}

export function generateAtelierContentKey(contentID: string) {
  return `atelier_content_${contentID}`
}
