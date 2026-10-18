// Tweet の埋め込み（components/blocks/Tweet.astro）の iframe の高さを、Tweet.html が親ウィンドウへ
// postMessage で送る resize 通知に合わせる（issue #1325）。
// 高さは 400 で描き始め、通知が届かないあいだ（届く前・削除済みの Tweet など）はそのまま。
// message はページ内のどのフレームからでも届くので、origin・送信元の iframe・Tweet ID を確かめたものだけ使う

const tweetEmbedOrigin = 'https://platform.twitter.com'
const resizeMethod = 'twttr.private.resize'

let installed = false

export function setupTweetResize(): void {
  if (installed) {
    return
  }
  installed = true
  window.addEventListener('message', (e) => {
    if (e.origin !== tweetEmbedOrigin) {
      return
    }
    const frame = findTweetFrame(e.source)
    if (!frame) {
      return
    }
    const height = resizeHeight(e.data, frame.dataset.tweetId ?? '')
    if (height === null) {
      return
    }
    frame.height = String(height)
  })
}

// 送信元のウィンドウを持つ Tweet の iframe
function findTweetFrame(source: MessageEventSource | null): HTMLIFrameElement | null {
  for (const frame of document.querySelectorAll<HTMLIFrameElement>('iframe[data-tweet-id]')) {
    if (frame.contentWindow === source) {
      return frame
    }
  }
  return null
}

// Tweet.html の resize 通知（実測）:
// { 'twttr.embed': { jsonrpc: '2.0', method: 'twttr.private.resize', id: 'embed-0',
//   params: [{ width: 535, height: 786, data: { tweet_id: '1849647087023161678' } }] } }
// 形が合い、tweet_id が iframe のものと一致するときだけ高さを返す
function resizeHeight(data: unknown, tweetID: string): number | null {
  if (!isRecord(data) || !isRecord(data['twttr.embed'])) {
    return null
  }
  const embed = data['twttr.embed']
  if (embed.method !== resizeMethod || !Array.isArray(embed.params)) {
    return null
  }
  const param: unknown = embed.params[0]
  if (!isRecord(param) || !isRecord(param.data) || param.data.tweet_id !== tweetID) {
    return null
  }
  const height = param.height
  if (typeof height !== 'number' || !Number.isFinite(height) || height <= 0) {
    return null
  }
  return Math.ceil(height)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
