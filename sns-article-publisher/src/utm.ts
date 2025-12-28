export type SNSTarget = 'twitter' | 'bluesky' | 'misskey' | 'nostr'
export type ServiceType = 'blog' | 'illust' | 'comic'

export interface UTMParams {
  source: SNSTarget
  medium: 'social'
  campaign: 'auto_post'
  content: ServiceType
}

/**
 * URLにUTMパラメータを追加する
 * @param url - 対象URL
 * @param params - UTMパラメータ
 * @returns UTMパラメータが追加されたURL
 */
export function addUtmParams(url: string, params: UTMParams): string {
  try {
    const urlObj = new URL(url)

    urlObj.searchParams.set('utm_source', params.source)
    urlObj.searchParams.set('utm_medium', params.medium)
    urlObj.searchParams.set('utm_campaign', params.campaign)
    urlObj.searchParams.set('utm_content', params.content)

    return urlObj.toString()
  } catch {
    // URL解析に失敗した場合は元のURLをそのまま返す
    return url
  }
}
