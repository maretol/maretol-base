import { WebhookPayload, Content } from 'api-types'
import { PostTweet, createTwitterAuthInfo } from './twitter'
import PostBlueSky, { createBlueSkyAuthInfo } from './bluesky'
import PostNostrKind1, { createNostrAuthInfo } from './nostr'
import NoteMisskey, { createMisskeyAuthInfo } from './misskey'
import { Env } from '.'

const TARGET = {
  twitter: true,
  bluesky: true,
  nostr: true,
  mastodon: false,
  misskey: true,
}

export default async function postTrigger(bodyJSON: WebhookPayload, env: Env, ctx: ExecutionContext): Promise<void> {
  if (!publishNecessary(bodyJSON)) {
    console.log('publishNecessary is false. end')
    return
  }
  console.log('publishNecessary is true. start publish')

  const newContent = bodyJSON.contents.new.publishValue

  const articleURL = `https://www.maretol.xyz/blog/${newContent.id}`
  const articleTitle = newContent.title
  const postMessage = newContent.sns_text
  const ogpImage = newContent.ogp_image

  console.log('articleURL: ' + articleURL)
  console.log('articleTitle: ' + articleTitle)
  console.log('postMessage: ' + postMessage)
  console.log('ogpImage: ' + ogpImage)
  console.log('publish wait until')
  ctx.waitUntil(publish(env, articleURL, articleTitle, postMessage, ogpImage))
}

async function publish(
  env: Env,
  articleURL: string,
  articleTitle: string,
  postMessage: string | null,
  ogpImage: string | null
) {
  let postText = ''
  if (postMessage === undefined || postMessage === null || postMessage === '') {
    postText = `投稿しました：${articleTitle} | Maretol Base\n${articleURL}`
  } else {
    postText = `${postMessage}\n\n投稿しました：${articleTitle} | Maretol Base\n${articleURL}`
  }
  console.log('postText: ' + postText)

  // 以下各種SNSへのポスト
  // 1. Twitter
  if (TARGET['twitter']) {
    console.log('post to Twitter')
    const twiAuth = createTwitterAuthInfo(env)
    try {
      const tweet = { text: postText }
      await PostTweet(twiAuth, [tweet])
    } catch (e) {
      console.error('Error posting to Twitter:', e)
    }
  } else {
    console.log('skip Twitter')
  }

  // 2. BlueSky
  if (TARGET['bluesky']) {
    console.log('post to BlueSky')
    const bskyAuth = createBlueSkyAuthInfo(env)
    const ogpInfo = {
      title: articleTitle,
      description: postMessage || '',
      url: articleURL,
      image: ogpImage,
    }
    try {
      await PostBlueSky(env, bskyAuth, postText, ogpInfo)
    } catch (e) {
      console.error('Error posting to BlueSky:', e)
    }
  } else {
    console.log('skip BlueSky')
  }

  // 3. Mastodon
  // 4. Misskey
  if (TARGET['misskey']) {
    console.log('post to Misskey')
    const misskeyAuth = createMisskeyAuthInfo(env)
    try {
      await NoteMisskey(misskeyAuth, postText)
    } catch (e) {
      console.error('Error posting to Misskey:', e)
    }
  } else {
    console.log('skip Misskey')
  }

  // 5. nostr
  if (TARGET['nostr']) {
    console.log('post to nostr')
    const nostrAuth = createNostrAuthInfo(env)
    try {
      await PostNostrKind1(nostrAuth, postText)
    } catch (e) {
      console.error('Error posting to nostr:', e)
    }
  } else {
    console.log('skip nostr')
  }
}

function publishNecessary(bodyJSON: WebhookPayload): boolean {
  if (bodyJSON.api !== 'contents') {
    return false
  }
  return (
    bodyJSON.type === 'new' ||
    (bodyJSON.type === 'edit' && isDraftToPublish(bodyJSON.contents.old, bodyJSON.contents.new))
  )
}

function isDraftToPublish(old: Content | null, newContent: Content): boolean {
  if (!old) {
    return false
  }
  if (old.status.includes('PUBLISH')) {
    // すでに公開済み
    return false
  }
  // 未公開で、下書き状態から公開状態に変更された場合
  return old.status.includes('DRAFT') && newContent.status.includes('PUBLISH')
}
