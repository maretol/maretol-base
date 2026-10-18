import PostTweet, { TwitterAuthInfo } from './twitter'
import PostBlueSky, { BlueSkyAuthInfo } from './bluesky'
import PostNostrKind1, { NostrAuthInfo } from './nostr'
import { SNSPostTextResult, SNSPublishArgs } from 'api-types'
import { WorkerEntrypoint } from 'cloudflare:workers'
import NoteMisskey, { MisskeyAuthInfo } from './misskey'
import { addUtmParams, SNSTarget } from './utm'
import { postToTargets } from './post'

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
  const createPostURL = (snsTarget: SNSTarget): string =>
    addUtmParams(url, {
      source: snsTarget,
      medium: 'social',
      campaign: 'auto_post',
      content: service,
    })
  const createPostText = (snsTarget: SNSTarget): string => {
    const urlWithUtm = createPostURL(snsTarget)
    const text =
      postMessage === undefined || postMessage === null || postMessage === ''
        ? `${prefix}：${title} | Maretol Base\n${urlWithUtm}`
        : `${postMessage}\n\n${prefix}：${title} | Maretol Base\n${urlWithUtm}`
    console.log(`postText (${snsTarget}): ${text}`)
    return text
  }

  // BlueSky はリンクカード（OGP）付きで投稿する
  const bskyOGPInfo = {
    title: title,
    description: postMessage || '',
    url: createPostURL('bluesky'),
    image: ogpImage,
  }

  const results = await postToTargets([
    { target: 'twitter', run: () => PostTweet(createTwitterAuthInfo(env), createPostText('twitter')) },
    {
      target: 'bluesky',
      run: () => PostBlueSky(env, createBlueSkyAuthInfo(env), createPostText('bluesky'), bskyOGPInfo),
    },
    { target: 'misskey', run: () => NoteMisskey(createMisskeyAuthInfo(env), createPostText('misskey')) },
    { target: 'nostr', run: () => PostNostrKind1(createNostrAuthInfo(env), createPostText('nostr')) },
  ])
  // 記事の投稿は waitUntil で待たないので、結果はログにだけ残す
  console.log('publish results:', JSON.stringify(results))
}

// 自由文面を有効な各SNSへそのまま投稿し、SNSごとの成否を返す
async function postFreeText(env: Env, text: string): Promise<SNSPostTextResult[]> {
  return postToTargets([
    { target: 'twitter', run: () => PostTweet(createTwitterAuthInfo(env), text) },
    { target: 'bluesky', run: () => PostBlueSky(env, createBlueSkyAuthInfo(env), text) },
    { target: 'misskey', run: () => NoteMisskey(createMisskeyAuthInfo(env), text) },
    { target: 'nostr', run: () => PostNostrKind1(createNostrAuthInfo(env), text) },
  ])
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
