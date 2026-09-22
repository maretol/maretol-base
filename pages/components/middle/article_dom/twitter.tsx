import { outerContentIframeSandbox } from '@/lib/static'

// Tweet の埋め込みは platform.twitter.com の埋め込みページを src で直接読み込む
// oEmbed の HTML を srcDoc で流し込む形だと iframe が自サイトと同一オリジンになり、
// 外部スクリプト(widgets.js)に allow-same-origin で親の DOM や storage へのアクセスを許してしまう
// 埋め込みページは自身のオリジン(platform.twitter.com)から cdn.syndication.twimg.com を
// XHR で叩くため、opaque origin では CORS で弾かれる。よって src 形式 + allow-same-origin が必要
const tweetEmbedBaseURL = 'https://platform.twitter.com/embed/Tweet.html'

export default function TwitterArea({ twitterURL }: { twitterURL: string }) {
  const tweetID = getTweetID(twitterURL)
  if (!tweetID) {
    return <p>Twitterの埋め込みがありましたがURLが不正なようです</p>
  }

  const embedURL = new URL(tweetEmbedBaseURL)
  embedURL.searchParams.set('id', tweetID)
  embedURL.searchParams.set('dnt', 'true') // Do Not Track
  embedURL.searchParams.set('lang', 'ja')

  // allowFullScreen は Tweet 内の動画を全画面再生するために必要
  // loading="lazy" で画面外にある間は Twitter 側の JS / XHR を走らせない
  return (
    <iframe
      src={embedURL.toString()}
      title="埋め込まれたポスト"
      sandbox={outerContentIframeSandbox}
      allowFullScreen
      loading="lazy"
      width={550}
      height={400}
    ></iframe>
  )
}

// cms-data-fetcher の parse.ts(isTwitter)と同じホスト一覧。ここでも検査して他経路からの呼び出しに備える
const tweetHostnames = ['twitter.com', 'www.twitter.com', 'x.com']

// https://twitter.com/{user}/status/{id} や https://x.com/{user}/status/{id} 形式のURLから Tweet ID を取り出す
function getTweetID(twitterURL: string): string | null {
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
