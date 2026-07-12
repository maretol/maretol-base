/**
 * SNS自動投稿の通知（sns-article-publisher の RPC 呼び出し）
 *
 * Service Binding は同一アカウント内でバインディングを宣言した Worker からしか呼べないため、
 * microCMS Webhook 時代の APIキー・HMAC署名による認証は不要（cms_design.md「4. SNS 通知」参照）
 *
 * - 送信条件: 「新規公開」または「下書き→公開」（blogのみ is_secret を除外）
 * - SNS_NOTIFY_ENABLED が 'true' の環境でのみ送信する（staging/ローカルからの誤投稿防止）
 */
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { SNSPublishValue } from 'api-types'
import type { BlogContentInput } from './db_blog'
import type { BandeDessineeInput } from './db_comic'
import type { AtelierInput } from './db'

type ContentStatus = 'PUBLISH' | 'DRAFT' | 'CLOSED'

type NotifyMeta = {
  type: 'new' | 'edit'
  // edit の場合のみ。保存前の status
  oldStatus?: ContentStatus
}

// 送信条件: 「新規公開」または「下書き→公開」。すでに公開済みのコンテンツの編集では投稿しない
function isPublishEvent(status: ContentStatus, { type, oldStatus }: NotifyMeta): boolean {
  if (status !== 'PUBLISH') {
    return false
  }
  if (type === 'edit' && oldStatus === 'PUBLISH') {
    return false
  }
  return true
}

async function publishToSNS(serviceType: 'blog' | 'illust' | 'comic', value: SNSPublishValue): Promise<void> {
  const { env } = await getCloudflareContext({ async: true })

  if (env.SNS_NOTIFY_ENABLED !== 'true') {
    console.log('SNS notify skipped: disabled in this environment')
    return
  }

  try {
    await env.SNS_PUBLISHER.publishArticle(serviceType, value)
    console.log(`SNS notify sent (${serviceType}: ${value.id})`)
  } catch (e) {
    // SNS通知の失敗でコンテンツ保存を失敗させない
    console.error('SNS notify error:', e)
  }
}

export async function notifyBlogPublishToSNS({
  input,
  type,
  oldStatus,
}: NotifyMeta & { input: BlogContentInput }): Promise<void> {
  // 限定公開記事（is_secret=true）はSNSへ自動投稿しない
  if (input.is_secret || !isPublishEvent(input.status, { type, oldStatus })) {
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
  type,
  oldStatus,
}: NotifyMeta & { input: AtelierInput }): Promise<void> {
  if (!isPublishEvent(input.status, { type, oldStatus })) {
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
  type,
  oldStatus,
}: NotifyMeta & { input: BandeDessineeInput }): Promise<void> {
  if (!isPublishEvent(input.status, { type, oldStatus })) {
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
