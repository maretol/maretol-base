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
  title: string // blog/illustで共通
  title_name: string // comicのタイトル
  src: string | null // illustのときの画像ソース
  sns_text: string | null // blogのときのSNS投稿文（マンガ、イラストでは対応するときにこの名前に合わせる
  ogp_image: string | null // blogのときのOGP画像。illustのときはsrc、comicの場合coverまたはfirst_page
  cover: string | null // comicのときの表紙。ただしない場合は1ページ目をogpにする
  first_page: number // comicのときの1ページ目のファイル番号
  filename: string // comicのときの1ページ目を取り出すときに利用する値
  format: string[] // comicのときのファイル形式
}
