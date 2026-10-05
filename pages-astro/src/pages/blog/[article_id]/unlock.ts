import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { getSecretMeta } from '@/lib/api/cms'
import { getDraftKey, withDraftKey } from '@/lib/draft'
import { ipRateLimitKey } from '@/lib/rate_limit'
import { secureEqual, signUnlock, unlockCookieName, unlockCookieOptions } from '@/lib/secret_unlock'

// 限定公開記事の解錠。閲覧コードを照合し、一致したら解錠の Cookie を発行する。
// 入力フォーム（components/islands/SecretGateForm.tsx）は、結果を JSON で受け取って表示する。
// JS が動く前に送信された場合は通常のフォーム送信になるので、結果にかかわらず記事へ戻す（解錠できていれば本文が出る）

// location は、解錠のあとに開く記事の URL（正規の表記）
export type UnlockResult = { ok: true; location: string } | { ok: false; error: string }

export const POST: APIRoute = async ({ params, request, cookies, url }) => {
  const articleID = params.article_id!
  // 下書きプレビューのときは draftKey が付く。渡さないと、未公開の記事の secret_code を取得できない
  const draftKey = getDraftKey(url)
  const wantsJSON = request.headers.get('Accept')?.includes('application/json') ?? false
  const articleURL = withDraftKey(`/blog/${encodeURIComponent(articleID)}`, draftKey)

  const respond = (status: number, result: UnlockResult): Response =>
    wantsJSON
      ? Response.json(result, { status })
      : new Response(null, { status: 303, headers: { Location: articleURL } })

  // 総当たりを防ぐため、IP ごと（IPv6 は /64 ごと）に試行回数を制限する（#1301）。制限は colo 単位の近似
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const { success } = await env.SECRET_UNLOCK_RATE_LIMIT.limit({ key: ipRateLimitKey(ip) })
  if (!success) {
    return respond(429, { ok: false, error: '試行回数が多すぎます。しばらく待ってからもう一度お試しください' })
  }

  const input = await request.formData().then(
    (form) => form.get('secret_code'),
    () => null,
  )
  if (typeof input !== 'string' || input === '') {
    return respond(400, { ok: false, error: 'コードを入力してください' })
  }

  const meta = await getSecretMeta(articleID, draftKey)
  if (!meta.is_secret || !meta.secret_code) {
    // 限定公開でない、またはコードが設定されていない（設定の誤り）場合は解錠しない
    return respond(403, { ok: false, error: '認証できませんでした' })
  }
  if (!(await secureEqual(input, meta.secret_code))) {
    return respond(403, { ok: false, error: 'コードが違います' })
  }

  cookies.set(
    unlockCookieName(articleID),
    await signUnlock(articleID, meta.secret_code),
    unlockCookieOptions(articleID),
  )
  return respond(200, { ok: true, location: articleURL })
}
