import { outerContentIframeSandbox } from '@/lib/static'

export default function YouTubeArea({ videoURL }: { videoURL: string }) {
  const youtubeURL = new URL(videoURL)
  const isShort = youtubeURL.pathname.startsWith('/shorts/')
  const videoID = getVideoID(youtubeURL)
  if (!videoID) {
    return <p>YouTubeの埋め込みがありましたがURLが不正ですなようです</p>
  }
  return (
    <div className="py-6 mx-3">
      <iframe
        src={`https://www.youtube.com/embed/${videoID}`}
        sandbox={outerContentIframeSandbox + ' allow-presentation'} // allow-presentation を追加して全画面表示を許可
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        width={isShort ? 315 : 560}
        height={isShort ? 560 : 315}
      ></iframe>
    </div>
  )
}

function getVideoID(youtubeURL: URL): string | null {
  // Shorts の場合 /shorts/{videoID} 形式
  if (youtubeURL.pathname.startsWith('/shorts/')) {
    return youtubeURL.pathname.split('/')[2] || null
  }
  // 短縮URLの場合 youtu.be/{videoID} 形式
  if (youtubeURL.hostname === 'youtu.be') {
    return youtubeURL.pathname.split('/')[1] || null
  }
  // 通常の動画URLの場合 watch?v={videoID} 形式
  return youtubeURL.searchParams.get('v')
}
