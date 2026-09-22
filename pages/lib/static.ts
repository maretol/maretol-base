// 固定パラメータ定義ファイル

// 1ページあたりの表示数
export const pageLimit = 10

// 外部コンテンツ(YouTube / Google Maps / Tweet など)を src で読み込む iframe の sandbox 属性
// - allow-scripts: 埋め込みプレイヤー等が JS で動くため必須
// - allow-same-origin: 埋め込み先が自身のオリジン(youtube.com 等)で動くために必要。
//   これがないと opaque origin になり、埋め込み側の XHR が CORS で弾かれたり storage が使えず描画が壊れる
//   (YouTube: 真っ黒のまま、Tweet: 空白になることを確認済み)
// - allow-popups / allow-popups-to-escape-sandbox: 「YouTube で見る」「地図を開く」などの別タブ遷移を
//   sandbox を引き継がずに開くために必要
// 注意: この値は src が別オリジンの iframe 専用。srcDoc の iframe は親と同一オリジンになるため、
// allow-scripts と allow-same-origin を併用すると sandbox が実質無効になる。srcDoc では使わないこと
export const outerContentIframeSandbox = 'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin'

// 通常ブログ等での画像編集オプション
export const imageOption = 'format=auto,h=500'
// 画像の元画像のオプション
export const originImageOption = 'format=auto'
// OGP画像のオプション
export const ogpImageOption = 'w=1200,h=630,f=webp,q=70'
// サイドバーで表示する画像のオプション
export const sidebarImageOption = 'w=200,h=300,f=webp,q=70'

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
export const DAY = HOUR * 24

// 画像キャッシュの保持期間（秒）
export const imageCacheDuration = 7 * DAY
