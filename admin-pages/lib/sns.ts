/**
 * SNS自動投稿の通知（sns-article-publisher の RPC 呼び出し）
 *
 * Service Binding は同一アカウント内でバインディングを宣言した Worker からしか呼べないため、
 * microCMS Webhook 時代の APIキー・HMAC署名による認証は不要（cms_design.md「4. SNS 通知」参照）
 *
 * - 送信条件: 初回公開（保存前の行が公開されたことがなく、保存後の status が PUBLISH）のみ。blog は is_secret を除外
 *   一度公開したコンテンツは下書きに戻せず（lib/status.ts）、非公開 → 公開の再公開では投稿しない（issue #1404。
 *   再告知は管理画面の SNS 投稿から手で行う）
 * - SNS_NOTIFY_ENABLED が 'true' の環境でのみ送信する（staging/ローカルからの誤投稿防止）
 */
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { SNSPostTextResult, SNSPublishArgs } from 'api-types'
import type { BlogContentInput } from './db_blog'
import type { BandeDessineeInput } from './db_comic'
import type { AtelierInput } from './db'
import type { ContentStatus } from './status'

// 保存前の行の公開状態。新規作成は null
type CurrentRow = { status: ContentStatus; published_at: string | null } | null

type NotifyMeta = {
  current: CurrentRow
}

// 保存前の行が公開されたことがあるか。初公開日時（published_at）か、いま公開中か（status）のどちらかで判断する。
// published_at の無いまま PUBLISH になっている行（移行データなど）を編集しても再投稿しないよう、status も見る
function wasPublished(current: CurrentRow): boolean {
  return current !== null && (current.published_at !== null || current.status === 'PUBLISH')
}

// 送信条件: 初回公開のみ。すでに公開したことのあるコンテンツの編集・再公開では投稿しない
function isFirstPublish(status: ContentStatus, current: CurrentRow): boolean {
  return status === 'PUBLISH' && !wasPublished(current)
}

async function publishToSNS(...args: SNSPublishArgs): Promise<void> {
  const { env } = await getCloudflareContext({ async: true })
  const [serviceType, value] = args

  if (env.SNS_NOTIFY_ENABLED !== 'true') {
    console.log('SNS notify skipped: disabled in this environment')
    return
  }

  try {
    await env.SNS_PUBLISHER.publishArticle(...args)
    console.log(`SNS notify sent (${serviceType}: ${value.id})`)
  } catch (e) {
    // SNS通知の失敗でコンテンツ保存を失敗させない
    console.error('SNS notify error:', e)
  }
}

// 管理ページからの自由文面投稿（sns-article-publisher の postText RPC 呼び出し）
// 自動通知（publishToSNS）と異なり結果を画面に表示するため、エラーを握りつぶさず成否を返す
export async function postTextToSNS(text: string): Promise<{ results?: SNSPostTextResult[]; error?: string }> {
  const { env } = await getCloudflareContext({ async: true })

  if (env.SNS_NOTIFY_ENABLED !== 'true') {
    return { error: 'この環境ではSNS投稿が無効化されています（SNS_NOTIFY_ENABLED が true ではありません）' }
  }

  try {
    const results = await env.SNS_PUBLISHER.postText(text)
    return { results }
  } catch (e) {
    console.error('SNS post error:', e)
    return { error: e instanceof Error ? e.message : 'SNSへの投稿に失敗しました' }
  }
}

export async function notifyBlogPublishToSNS({
  input,
  current,
}: NotifyMeta & { input: BlogContentInput }): Promise<void> {
  // 限定公開記事（is_secret=true）はSNSへ自動投稿しない
  if (input.is_secret || !isFirstPublish(input.status, current)) {
    return
  }
  await publishToSNS('blog', {
    id: input.id,
    title: input.title,
    sns_text: input.sns_text,
    ogp_image: input.ogp_image,
    is_secret: input.is_secret,
  })
}

export async function notifyAtelierPublishToSNS({
  input,
  current,
}: NotifyMeta & { input: AtelierInput }): Promise<void> {
  if (!isFirstPublish(input.status, current)) {
    return
  }
  await publishToSNS('illust', {
    id: input.id,
    title: input.title,
    src: input.src,
  })
}

export async function notifyComicPublishToSNS({
  input,
  current,
}: NotifyMeta & { input: BandeDessineeInput }): Promise<void> {
  if (!isFirstPublish(input.status, current)) {
    return
  }
  // OGP画像は投稿側（sns-article-publisher）で cover または1ページ目（filename + first_page + format）から組み立てる
  await publishToSNS('comic', {
    id: input.id,
    title_name: input.title_name,
    cover: input.cover,
    filename: input.filename,
    first_page: input.first_page,
    format: input.format,
  })
}
