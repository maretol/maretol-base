import { test, expect } from '@playwright/test'

// 限定公開記事（cookie 認証）の検証（任意・既定スキップ）。
//   - 解錠 Cookie は `secret_unlock_<articleID>`（HMAC 署名値, path=`/blog/<articleID>`）。
//   - 署名の再現には鍵と secret_code が必要なため、Cookie 値は CI 外で事前計算し、
//     `E2E_SECRET_COOKIE` として注入する（秘匿値はログ/成果物へ出力しない）。
//   - 必要な情報が未設定の場合は test.skip でスキップする。
const secretCookie = process.env.E2E_SECRET_COOKIE
const secretArticleId = process.env.E2E_SECRET_ARTICLE_ID

test('locked article shows protected content when unlock cookie is provided', async ({ page, context, baseURL }) => {
  test.skip(
    !secretCookie || !secretArticleId,
    'E2E_SECRET_COOKIE / E2E_SECRET_ARTICLE_ID が未設定のため、限定公開記事の認証テストをスキップします',
  )

  const hostname = new URL(baseURL as string).hostname
  const path = `/blog/${secretArticleId}`

  await context.addCookies([
    {
      name: `secret_unlock_${secretArticleId}`,
      value: secretCookie as string,
      domain: hostname,
      path,
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ])

  const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
  expect(response, 'no response for locked article').not.toBeNull()
  expect(response!.ok()).toBeTruthy()

  // 解錠済みとして本文（記事見出し）が表示されること。
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
})
