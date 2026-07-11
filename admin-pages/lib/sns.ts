/**
 * SNS自動投稿の通知（sns-article-publisher 呼び出し）
 *
 * 現行の microCMS Webhook と完全互換のペイロード・ヘッダで送るため、
 * sns-article-publisher は無改修で動作する（cms_design.md「4. SNS 通知」参照）
 *
 * - ヘッダ: x-mcms-api-key（SNS_PUB_CMS_KEY）+ x-microcms-signature（HMAC-SHA256）
 * - 送信条件: blog記事の「新規公開」または「下書き→公開」かつ is_secret でない
 *   （受け側でも同条件で判定されるが、無駄な送信をしないため送信側でも絞る）
 * - SNS_NOTIFY_ENABLED が 'true' の環境でのみ送信する（staging からの誤投稿防止）
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
  if (!env.SNS_PUB_CMS_KEY || !env.SNS_PUB_CMS_SECRET) {
    console.warn('SNS notify skipped: SNS_PUB_CMS_KEY / SNS_PUB_CMS_SECRET が未設定')
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

  // sns-article-publisher が参照するフィールドのみ正確に埋める（WebhookPayload 互換）
  const publishValue = {
    id: input.id,
    title: input.title,
    sns_text: input.sns_text,
    ogp_image: input.ogp_image,
    is_secret: input.is_secret,
  }
  const payload = {
    service: 'maretol-blog',
    api: 'contents',
    id: input.id,
    type,
    contents: {
      old:
        type === 'edit'
          ? { id: input.id, status: [oldStatus ?? 'DRAFT'], draftKey: null, publishValue, draftValue: null }
          : null,
      new: { id: input.id, status: ['PUBLISH'], draftKey: null, publishValue, draftValue: null },
    },
  }

  const body = JSON.stringify(payload)
  const signature = await hmacSHA256Hex(env.SNS_PUB_CMS_SECRET, body)

  try {
    // Service Binding 経由で呼び出す（URLはダミーでヘッダ・ボディのみ参照される）
    const res = await env.SNS_PUBLISHER.fetch('https://sns-article-publisher/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-mcms-api-key': env.SNS_PUB_CMS_KEY,
        'x-microcms-signature': signature,
      },
      body,
    })
    console.log(`SNS notify: ${res.status} (article: ${input.id})`)
  } catch (e) {
    // SNS通知の失敗で記事保存を失敗させない
    console.error('SNS notify error:', e)
  }
}

async function hmacSHA256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
