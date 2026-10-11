import PostTweet, { TwitterAuthInfo } from './twitter'
import PostBlueSky, { BlueSkyAuthInfo } from './bluesky'
import PostNostrKind1, { NostrAuthInfo } from './nostr'
import { SNSPostTextResult, SNSPublishArgs } from 'api-types'
import { WorkerEntrypoint } from 'cloudflare:workers'
import NoteMisskey, { MisskeyAuthInfo } from './misskey'
import { addUtmParams, SNSTarget } from './utm'

export interface Env {
  TWI_API_KEY: string
  TWI_API_SECRET: string
  TWI_ACCESS_TOKEN: string
  TWI_ACCESS_TOKEN_SECRET: string

  BSKY_USERNAME: string
  BSKY_PASSWORD: string

  NOSTR_NSEC: string

  MISSKEY_API_TOKEN: string

  IMAGES: ImagesBinding
}

const TARGET = {
  twitter: true,
  bluesky: true,
  nostr: true,
  mastodon: false,
  misskey: true,
}

type ServiceType = SNSPublishArgs[0]

type PublishContent = {
  url: string
  title: string
  message: string | null
  ogpImage: string | null
}

// 管理ページ（admin-pages）から Service Binding の RPC で呼ぶ。HTTP の入口（ルート・workers.dev）は持たない
export default class Publisher extends WorkerEntrypoint<Env> {
  // Service Binding は同一アカウント内でバインディングを宣言した Worker からしか呼べないため、
  // API キー・署名検証は不要
  // 投稿可否の判定（新規公開・下書き→公開のみ、限定公開除外）は呼び出し側で行う
  async publishArticle(...args: SNSPublishArgs): Promise<void> {
    const [serviceType] = args
    const content = getContent(...args)
    console.log('RPC publishArticle:', serviceType, content.url)
    this.ctx.waitUntil(publish(this.env, content, serviceType))
  }

  // 管理ページ（admin-pages）から自由文面を各SNSへそのまま投稿する RPC
  // 記事に紐づかないためURL組み立て・UTMパラメータ付与は行わない
  // 結果を管理ページの画面に表示するため、publishArticle と異なり完了まで待って成否を返す
  async postText(text: string): Promise<SNSPostTextResult[]> {
    console.log('RPC postText')
    return await postFreeText(this.env, text)
  }

  // Cloudflare API はデフォルトエクスポートに fetch などのイベントハンドラが無いスクリプトを
  // 「The uploaded script has no registered event handlers [code: 10068]」で拒否する（RPC メソッドは数えない）
  // https://github.com/cloudflare/workers-sdk/issues/5663
  // デプロイを通すためだけのハンドラで、HTTP の入口は無いので通常は呼ばれない。呼ばれたら誤用なので例外にする
  async fetch(): Promise<Response> {
    throw new Error('sns-article-publisher is RPC-only. Call publishArticle / postText via the Service Binding')
  }
}

async function publish(env: Env, content: PublishContent, service: ServiceType) {
  const url = content.url
  const title = content.title
  const postMessage = content.message
  const ogpImage = content.ogpImage

  const postPrefixMap: Record<ServiceType, string> = {
    blog: '投稿しました',
    illust: 'イラストを公開しました',
    comic: 'マンガを公開しました',
  }
  const prefix = postPrefixMap[service]

  // SNSごとにUTMパラメータ付きURLを生成し、投稿テキストを作成
  const createPostText = (snsTarget: SNSTarget): string => {
    const urlWithUtm = addUtmParams(url, {
      source: snsTarget,
      medium: 'social',
      campaign: 'auto_post',
      content: service,
    })
    if (postMessage === undefined || postMessage === null || postMessage === '') {
      return `${prefix}：${title} | Maretol Base\n${urlWithUtm}`
    } else {
      return `${postMessage}\n\n${prefix}：${title} | Maretol Base\n${urlWithUtm}`
    }
  }

  // 以下各種SNSへのポスト
  // 1. Twitter
  if (TARGET['twitter']) {
    console.log('post to Twitter')
    const twiAuth = createTwitterAuthInfo(env)
    const postText = createPostText('twitter')
    console.log('postText (Twitter): ' + postText)
    try {
      await PostTweet(twiAuth, postText)
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
    const urlWithUtm = addUtmParams(url, {
      source: 'bluesky',
      medium: 'social',
      campaign: 'auto_post',
      content: service,
    })
    const postText = createPostText('bluesky')
    console.log('postText (BlueSky): ' + postText)
    const ogpInfo = {
      title: title,
      description: postMessage || '',
      url: urlWithUtm,
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
    const postText = createPostText('misskey')
    console.log('postText (Misskey): ' + postText)
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
    const postText = createPostText('nostr')
    console.log('postText (nostr): ' + postText)
    try {
      await PostNostrKind1(nostrAuth, postText)
    } catch (e) {
      console.error('Error posting to nostr:', e)
    }
  } else {
    console.log('skip nostr')
  }
}

// 自由文面を有効な各SNSへそのまま投稿し、SNSごとの成否を返す
async function postFreeText(env: Env, text: string): Promise<SNSPostTextResult[]> {
  const results: SNSPostTextResult[] = []

  const post = async (target: SNSTarget, doPost: () => Promise<unknown>) => {
    if (!TARGET[target]) {
      console.log(`skip ${target}`)
      return
    }
    console.log(`post to ${target}`)
    try {
      await doPost()
      results.push({ target, success: true })
    } catch (e) {
      console.error(`Error posting to ${target}:`, e)
      results.push({ target, success: false, error: e instanceof Error ? e.message : String(e) })
    }
  }

  await post('twitter', () => PostTweet(createTwitterAuthInfo(env), text))
  await post('bluesky', () => PostBlueSky(env, createBlueSkyAuthInfo(env), text))
  await post('misskey', () => NoteMisskey(createMisskeyAuthInfo(env), text))
  await post('nostr', () => PostNostrKind1(createNostrAuthInfo(env), text))

  return results
}

function createTwitterAuthInfo(env: Env) {
  return {
    apiKey: env.TWI_API_KEY,
    apiSecret: env.TWI_API_SECRET,
    accessToken: env.TWI_ACCESS_TOKEN,
    accessTokenSecret: env.TWI_ACCESS_TOKEN_SECRET,
  } as TwitterAuthInfo
}

function createBlueSkyAuthInfo(env: Env) {
  return {
    username: env.BSKY_USERNAME,
    password: env.BSKY_PASSWORD,
  } as BlueSkyAuthInfo
}

function createNostrAuthInfo(env: Env) {
  return {
    nsec: env.NOSTR_NSEC,
  } as NostrAuthInfo
}

function createMisskeyAuthInfo(env: Env) {
  return {
    apiToken: env.MISSKEY_API_TOKEN,
  } as MisskeyAuthInfo
}

function getContent(...[serviceType, value]: SNSPublishArgs): PublishContent {
  switch (serviceType) {
    case 'blog':
      return {
        url: `https://www.maretol.xyz/blog/${value.id}`,
        title: value.title,
        message: value.sns_text,
        ogpImage: value.ogp_image,
      }
    case 'illust':
      return {
        url: `https://www.maretol.xyz/illust/detail/${value.id}`,
        title: value.title,
        message: null,
        ogpImage: value.src,
      }
    case 'comic': {
      // 表紙、または1ページ目
      // 1ページ目のファイル名生成はほぼ決め打ちでやっているので失敗時のリカバリが必要
      const ogp = value.cover || value.filename + '_00' + value.first_page + '.' + value.format[0]

      return {
        url: `https://www.maretol.xyz/comics/${value.id}`,
        title: value.title_name,
        message: null,
        ogpImage: ogp,
      }
    }
  }
}
