import { test, expect } from '@playwright/test'

// ブログ一覧から記事詳細への遷移テスト。
// 一覧から実在の記事リンクを取得し（IDはハードコードしない）、遷移先で記事詳細が描画されることを確認する。
test('navigates from blog list to an article detail', async ({ page }) => {
  await page.goto('/blog', { waitUntil: 'domcontentloaded' })

  // 記事詳細リンク（/blog/<id>）。一覧本文のカードタイトル等が該当する。
  const articleLinks = page.locator('a[href^="/blog/"]')
  const firstArticle = articleLinks.first()
  await firstArticle.waitFor({ state: 'visible' })

  // 一覧項目が1件以上存在すること（特定タイトル等の内容には依存しない）。
  expect(await articleLinks.count()).toBeGreaterThan(0)

  await firstArticle.click()

  // 実在記事の詳細ページへ遷移し、見出し（h1 タイトル）が描画されること。
  await expect(page).toHaveURL(/\/blog\/.+/)
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
})
