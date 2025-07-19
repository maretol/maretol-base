import { defaultSandbox } from '@/lib/static'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { cache } from 'react'

export default async function TwitterArea({ twitterURL }: { twitterURL: string }) {
  const sandbox = defaultSandbox + ' allow-presentation'
  try {
    const twitterPublishJSON = await fetchTweet(twitterURL)

    if (!twitterPublishJSON || !twitterPublishJSON.html || !twitterPublishJSON.width) {
      return <p>Error: fetching tweet is error.</p>
    }

    const twitterHTML = twitterPublishJSON.html
    const width = twitterPublishJSON.width

    return <iframe srcDoc={twitterHTML} sandbox={sandbox} allowFullScreen width={width} height={400}></iframe>
  } catch (error) {
    console.error('Error fetching tweet:', error)
    return <p>Error: fetching tweet is error.</p>
  }
}

const fetchTweet = cache(fetchTweetOrigin)

async function fetchTweetOrigin(tweetURL: string) {
  const { env } = await getCloudflareContext({ async: true })
  const tweetKey = 'tweet_' + tweetURL
  const cache = await env.OGP_FETCHER_CACHE.get(tweetKey)
  if (cache) {
    const tweetData = (await JSON.parse(cache)) as { html: string; width: number }
    return tweetData
  }

  const tweetPublishURL = `https://publish.twitter.com/oembed?url=${tweetURL}`
  const tweetPublish = await fetch(tweetPublishURL)
  if (!tweetPublish.ok) {
    throw new Error(`Failed to fetch Twitter embed: ${tweetPublish.status} ${tweetPublish.statusText}`)
  }
  const tweetPublishJSON = await tweetPublish.json<{ html: string; width: number }>()
  await env.OGP_FETCHER_CACHE.put(tweetKey, JSON.stringify(tweetPublishJSON), { expirationTtl: 60 * 60 * 24 }) // Cache for 24 hours
  return tweetPublishJSON
}
