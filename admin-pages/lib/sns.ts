/**
 * SNS自動投稿の通知（sns-article-publisher の RPC 呼び出し）
 *
 * Service Binding は同一アカウント内でバインディングを宣言した Worker からしか呼べないため、
 * microCMS Webhook 時代の APIキー・HMAC署名による認証は不要（cms_design.md「4. SNS 通知」参照）
 *
 * - 送信条件: blog記事の「新規公開」または「下書き→公開」かつ is_secret でない
 * - SNS_NOTIFY_ENABLED が 'true' の環境でのみ送信する（staging/ローカルからの誤投稿防止）
 */
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { BlogContentInput } from './db_blog'

type NotifyParams = {
  input: BlogContentInput
  type: 'new' | 'edit'
  // edit の場合のみ。保存前の status
  oldStatus?: 'PUBLISH' | 'DRAFT' | 'CLOSED'
}

export async function notifyBlogPublishToSNS({ input, type, oldStatus }: NotifyParams): Promise<void> {
  const { env } = await getCloudflareContext({ async: true })

  if (env.SNS_NOTIFY_ENABLED !== 'true') {
    console.log('SNS notify skipped: disabled in this environment')
    return
  }

  // 送信条件: 限定公開でない記事の「新規公開」または「下書き→公開」
  if (input.is_secret || input.status !== 'PUBLISH') {
    return
  }
  if (type === 'edit' && oldStatus === 'PUBLISH') {
    // すでに公開済みの記事の編集では投稿しない
    return
  }

  try {
    await env.SNS_PUBLISHER.publishArticle('blog', {
      id: input.id,
      title: input.title,
      sns_text: input.sns_text,
      ogp_image: input.ogp_image,
      is_secret: input.is_secret,
    })
    console.log(`SNS notify sent (article: ${input.id})`)
  } catch (e) {
    // SNS通知の失敗で記事保存を失敗させない
    console.error('SNS notify error:', e)
  }
}
