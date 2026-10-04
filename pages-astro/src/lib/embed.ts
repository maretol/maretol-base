// 外部コンテンツ（YouTube / Tweet / Google Maps）を埋め込む iframe の sandbox。
// - allow-scripts: 埋め込み側のプレイヤーや地図を動かすために必要
// - allow-same-origin: 埋め込み側が自身のオリジンとして動くために必要。
//   これがないと opaque origin になり、埋め込み側の XHR が CORS で弾かれたり storage が使えず描画が壊れる
// - allow-popups / allow-popups-to-escape-sandbox: 「YouTube で見る」「地図を開く」などの別タブ遷移を
//   sandbox を引き継がずに開くために必要
// 注意: この値は src が別オリジンの iframe 専用。srcdoc の iframe は親と同一オリジンになるため使わないこと
export const outerContentIframeSandbox = 'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin'

export function getYouTubeVideo(videoURL: string): { id: string; isShort: boolean } | null {
  let url: URL
  try {
    url = new URL(videoURL)
  } catch {
    return null
  }
  const isShort = url.pathname.startsWith('/shorts/')
  let id: string | null
  if (isShort) {
    // Shorts は /shorts/{videoID}
    id = url.pathname.split('/')[2] || null
  } else if (url.hostname === 'youtu.be') {
    // 短縮 URL は youtu.be/{videoID}
    id = url.pathname.split('/')[1] || null
  } else {
    // 通常の動画は watch?v={videoID}
    id = url.searchParams.get('v')
  }
  return id ? { id, isShort } : null
}

// cms-data-fetcher の parse.ts（isTwitter）と同じホスト一覧
const tweetHostnames = ['twitter.com', 'www.twitter.com', 'x.com']

// https://twitter.com/{user}/status/{id} や https://x.com/{user}/status/{id} 形式の URL から Tweet ID を取り出す
export function getTweetID(twitterURL: string): string | null {
  let url: URL
  try {
    url = new URL(twitterURL)
  } catch {
    return null
  }
  if (!tweetHostnames.includes(url.hostname)) {
    return null
  }
  const matched = url.pathname.match(/^\/(?:[A-Za-z0-9_]+|i\/web)\/status(?:es)?\/(\d+)/)
  return matched ? matched[1] : null
}
