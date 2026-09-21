export function generateContentsKey(offset: string, limit: string) {
  return `contents_${offset}_${limit}`
}

// 一覧の総件数だけを持つキー。一覧と同じ prefix "contents_" にして、一覧のパージで一緒に消えるようにする
export function generateContentsTotalKey() {
  return 'contents_total'
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

// タグ絞り込みの総件数。prefix "contents_" を共有し、一覧のパージで一緒に消えるようにする
export function generateContentsWithTagsTotalKey(tagIDs: string[]) {
  return `contents_with_tags_${[...tagIDs].sort().join('_')}_total`
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

// シリーズ絞り込みのマンガリスト。prefix "bande_dessinee_" を共有し、一覧・単体と同じ一括パージの対象にする
export function generateBandeDessineeBySeriesKey(seriesID: string, offset: string, limit: string) {
  return `bande_dessinee_series_${seriesID}_${offset}_${limit}`
}

// マンガリストの総件数。prefix "bande_dessinee_" を共有し、一覧のパージで一緒に消えるようにする
export function generateBandeDessineeTotalKey(seriesID?: string) {
  return seriesID !== undefined ? `bande_dessinee_series_${seriesID}_total` : 'bande_dessinee_total'
}

export function generateBandeDessineeContentKey(contentID: string) {
  return `bande_dessinee_content_${contentID}`
}

export function generateAtelierKey(offset: string, limit: string) {
  return `atelier_${offset}_${limit}`
}

// イラストリストの総件数。prefix "atelier_" を共有し、一覧のパージで一緒に消えるようにする
export function generateAtelierTotalKey() {
  return 'atelier_total'
}

export function generateAtelierContentKey(contentID: string) {
  return `atelier_content_${contentID}`
}
