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

// 管理ページ（admin-pages）から sns-article-publisher の publishArticle RPC へ渡す公開コンテンツ情報
// ContentValue のうち投稿文組み立てに使うフィールドのみ必須とする
export type SNSPublishValue = Partial<ContentValue> & { id: string }

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
  is_secret?: boolean // blogのときの限定公開フラグ。trueの場合は一覧非表示・SNS自動投稿の対象外とする
}
