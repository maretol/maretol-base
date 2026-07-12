// 本文の保存形式。html は旧CMS（microCMS）から移行した既存コンテンツ用、
// markdown が新規コンテンツの標準（配信時に cms-data-fetcher が変換する）
export type ContentFormat = 'markdown' | 'html'

export function parseContentFormat(value: string | null, fallback: ContentFormat = 'markdown'): ContentFormat {
  return value === 'html' || value === 'markdown' ? value : fallback
}
