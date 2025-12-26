export type SNSSource = 'twitter' | 'bluesky' | 'clipboard'
export type ContentType = 'blog' | 'illust' | 'comics' | 'page'
export type Campaign = 'share_button' | 'auto_post'

export interface UTMParams {
  source: SNSSource
  medium: 'social'
  campaign: Campaign
  content?: ContentType
}

/**
 * URLにUTMパラメータを追加する
 * 既存のクエリパラメータがある場合も正しく処理する
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

    if (params.content) {
      urlObj.searchParams.set('utm_content', params.content)
    }

    return urlObj.toString()
  } catch {
    // URL解析に失敗した場合は元のURLをそのまま返す
    return url
  }
}
