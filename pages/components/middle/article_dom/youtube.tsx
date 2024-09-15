import { defaultSandbox } from '@/lib/static'

export default function YouTubeArea({ videoURL }: { videoURL: string }) {
  const youtubeURL = new URL(videoURL)
  const videoID = youtubeURL.searchParams.get('v')
  if (!videoID) {
    return <p>YouTubeの埋め込みがありましたがURLが不正ですなようです</p>
  }
  return (
    <iframe
      src={`https://www.youtube.com/embed/${videoID}`}
      sandbox={defaultSandbox}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      width={560}
      height={315}
    ></iframe>
  )
}
