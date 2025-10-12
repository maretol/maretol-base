import { outerContentIframeSandbox } from '@/lib/static'

export default function YouTubeArea({ videoURL }: { videoURL: string }) {
  const youtubeURL = new URL(videoURL)
  const videoID = youtubeURL.searchParams.get('v')
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
        width={560}
        height={315}
      ></iframe>
    </div>
  )
}
