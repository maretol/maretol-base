import { test, expect } from '@playwright/test'
import { MAIN_ROUTES, NOT_FOUND_PATH, SITE_LOGO_ALT } from '../lib/constants'

// 主要ルートのスモークテスト。
// 各ルートが 2xx で応答し、共通ランドマーク（ヘッダーロゴ）が描画されることを確認する。
// アサーションは構造/存在ベースとし、変動しうる具体テキストへの完全一致依存は避ける。
for (const route of MAIN_ROUTES) {
  test(`main route responds and renders: ${route}`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
    expect(response, `no response for ${route}`).not.toBeNull()
    expect(response!.ok(), `unexpected status ${response!.status()} for ${route}`).toBeTruthy()

    // 共通シェルのロゴが可視であることのみを確認（CMS 由来の変動テキストには依存しない）。
    await expect(page.getByAltText(SITE_LOGO_ALT).first()).toBeVisible()
  })
}

test('unknown path returns 404', async ({ page }) => {
  const response = await page.goto(NOT_FOUND_PATH, { waitUntil: 'domcontentloaded' })
  expect(response, 'no response for unknown path').not.toBeNull()
  expect(response!.status()).toBe(404)
})
