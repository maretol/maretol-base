// cms の webhook で送られてくるデータの型定義
// cms_webhook_purger 以外で使用する場合、api-types に移動する

export type WebhookPayload = {
  service: string
  api: string
  id: string
  type: string
  contents: {
    old: Content | null
    new: Content
  }
}

export type Content = {
  id: string
  status: ('PUBLISH' | 'DRAFT' | 'CLOSED')[]
  draftKey: string | null
  publishValue: ContentValue
  draftValue: ContentValue | null
}

export type ContentValue = {
  id: string // 共通
  title: string // 共通
  src: string | null // illustのときの画像ソース
  sns_text: string | null // blogのときのSNS投稿文（マンガ、イラストでは対応するときにこの名前に合わせる
  ogp_image: string | null // blogのときのOGP画像。illustのときはsrcを読む
}
