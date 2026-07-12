export type SNSPubData = {
  article_url: string
  article_title: string
  post_message: string | null
}

// 管理ページ（admin-pages）から sns-article-publisher の postText RPC で
// 自由文面を投稿したときの、SNSごとの投稿結果
export type SNSPostTextResult = {
  target: 'twitter' | 'bluesky' | 'misskey' | 'nostr' | 'mastodon'
  success: boolean
  error?: string
}
