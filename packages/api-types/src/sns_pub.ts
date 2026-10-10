// 管理ページ（admin-pages）から sns-article-publisher の postText RPC で
// 自由文面を投稿したときの、SNSごとの投稿結果
export type SNSPostTextResult = {
  target: 'twitter' | 'bluesky' | 'misskey' | 'nostr' | 'mastodon'
  success: boolean
  error?: string
}

// 管理ページ（admin-pages）から sns-article-publisher の publishArticle RPC へ渡す引数（サービス種別と公開コンテンツ情報の組）
// サービス種別ごとに、投稿文・OGP画像の組み立てに使うフィールドを必須とする
export type SNSPublishArgs =
  | [serviceType: 'blog', value: SNSPublishBlogValue]
  | [serviceType: 'illust', value: SNSPublishIllustValue]
  | [serviceType: 'comic', value: SNSPublishComicValue]

export type SNSPublishBlogValue = {
  id: string
  title: string
  sns_text: string | null // SNS投稿文（マンガ、イラストでは対応するときにこの名前に合わせる）
  ogp_image: string | null
  is_secret: boolean // 限定公開フラグ。trueの場合は一覧非表示・SNS自動投稿の対象外とする
}

export type SNSPublishIllustValue = {
  id: string
  title: string
  src: string // 画像ソース。OGP画像にも使う
}

export type SNSPublishComicValue = {
  id: string
  title_name: string
  cover: string | null // 表紙。ない場合は1ページ目をOGP画像にする
  first_page: number // 1ページ目のファイル番号
  filename: string // 1ページ目を取り出すときに利用する値
  format: string[] // ファイル形式
}
