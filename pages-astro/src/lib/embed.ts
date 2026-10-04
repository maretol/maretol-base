import { parseURL } from '@/lib/utils'

// 外部コンテンツ（YouTube / Tweet / Google Maps）を埋め込む iframe の sandbox。
// - allow-scripts: 埋め込み側のプレイヤーや地図を動かすために必要
// - allow-same-origin: 埋め込み側が自身のオリジンとして動くために必要。
//   これがないと opaque origin になり、埋め込み側の XHR が CORS で弾かれたり storage が使えず描画が壊れる
// - allow-popups / allow-popups-to-escape-sandbox: 「YouTube で見る」「地図を開く」などの別タブ遷移を
//   sandbox を引き継がずに開くために必要
// 注意: この値は src が別オリジンの iframe 専用。srcdoc の iframe は親と同一オリジンになるため使わないこと
export const outerContentIframeSandbox = 'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin'

export function getYouTubeVideo(videoURL: string): { id: string; isShort: boolean } | null {
  const url = parseURL(videoURL)
  if (!url) {
    return null
  }
  const isShort = url.pathname.startsWith('/shorts/')
  const id = getYouTubeVideoID(url, isShort)
  return id ? { id, isShort } : null
}

function getYouTubeVideoID(url: URL, isShort: boolean): string | null {
  if (isShort) {
    // Shorts は /shorts/{videoID}
    return url.pathname.split('/')[2] || null
  }
  if (url.hostname === 'youtu.be') {
    // 短縮 URL は youtu.be/{videoID}
    return url.pathname.split('/')[1] || null
  }
  // 通常の動画は watch?v={videoID}
  return url.searchParams.get('v')
}

// cms-data-fetcher の parse.ts（isTwitter）と同じホスト一覧
const tweetHostnames = ['twitter.com', 'www.twitter.com', 'x.com']

// https://twitter.com/{user}/status/{id} や https://x.com/{user}/status/{id} 形式の URL から Tweet ID を取り出す
export function getTweetID(twitterURL: string): string | null {
  const url = parseURL(twitterURL)
  if (!url || !tweetHostnames.includes(url.hostname)) {
    return null
  }
  const matched = url.pathname.match(/^\/(?:[A-Za-z0-9_]+|i\/web)\/status(?:es)?\/(\d+)/)
  return matched ? matched[1] : null
}
