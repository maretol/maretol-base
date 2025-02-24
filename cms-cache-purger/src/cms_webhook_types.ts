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
  publishValue: any
  draftValue: any
}
