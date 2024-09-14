import { defaultSandbox } from '@/lib/static'

export default async function TwitterArea({ twitterURL }: { twitterURL: string }) {
  const twitterPublishURL = `https://publish.twitter.com/oembed?url=${twitterURL}`
  const twitterPublish = await fetch(twitterPublishURL)
  const twitterPublishJSON = await twitterPublish.json<{ html: string; width: number }>()

  const twitterHTML = twitterPublishJSON.html
  const width = twitterPublishJSON.width

  const sandbox = defaultSandbox + ' allow-presentation'

  return <iframe srcDoc={twitterHTML} sandbox={sandbox} allowFullScreen width={width} height={400}></iframe>
}
