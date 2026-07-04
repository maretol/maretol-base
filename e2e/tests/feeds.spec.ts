import { test, expect } from '@playwright/test'
import { RSS_FEED_PATH, RSS_ROOT_ELEMENT, SITEMAP_PATH, SITEMAP_ROOT_ELEMENT } from '../lib/constants'

// フィード（RSS / sitemap）の検証。
// ブラウザ描画は不要なため request コンテキストで取得する。
// content-type ヘッダ設定の有無には依存せず、status 200 + 本文のルート要素で判定する
// （RSS ルートは content-type を正しく設定していないため、ヘッダ非依存とする）。
test('rss feed responds with rss root element', async ({ request }) => {
  const response = await request.get(RSS_FEED_PATH)
  expect(response.status()).toBe(200)
  const body = await response.text()
  expect(body).toContain(RSS_ROOT_ELEMENT)
})

test('sitemap responds with urlset root element', async ({ request }) => {
  const response = await request.get(SITEMAP_PATH)
  expect(response.status()).toBe(200)
  const body = await response.text()
  expect(body).toContain(SITEMAP_ROOT_ELEMENT)
})
