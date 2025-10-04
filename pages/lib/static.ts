// 固定パラメータ定義ファイル

// 1ページあたりの表示数
export const pageLimit = 10

// iframe内部のsandbox属性のデフォルト値
export const defaultSandbox =
  'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-top-navigation'

// 通常ブログ等での画像編集オプション
export const imageOption = 'format=auto,h=500'
// 画像の元画像のオプション
export const originImageOption = 'format=auto'
// OGP画像のオプション
export const ogpImageOption = 'w=1200,h=630,f=webp,q=70'
// サイドバーで表示する画像のオプション
export const sidebarImageOption = 'w=200,h=300,f=webp,q=70'

// タグの最大選択数
export const maxTagCount = 3

// サンプル表示時の最大コンテンツ数
export const maxSampleContentCount = 5

// ComicBookコンポーネントのモード切り替え閾値（ピクセル幅）
export const comicModeThreshold = 980

// ComicBookコンポーネントのスクロール速度（ミリ秒）
export const comicScrollSpeed = 150

// キャッシュTTL（秒）
export const SECOND = 1
export const MINUTE = 60 * SECOND
export const HOUR = 60 * MINUTE
export const DAY = 60 * 60 * 24

// 画像キャッシュの保持期間（秒）
export const imageCacheDuration = 7 * DAY
