import { test, expect } from '@playwright/test'

// URL の正規化（astro_design.md 4.5）。エッジのキャッシュのエントリが表記揺れで分かれないように、
// 末尾のスラッシュとクエリを決まった形へリダイレクトする。ブラウザ描画は不要なので request コンテキストで確認する。
test('trailing slash is removed with 301', async ({ request }) => {
  const response = await request.get('/illust/', { maxRedirects: 0 })
  expect(response.status()).toBe(301)
  expect(new URL(response.headers()['location'], response.url()).pathname).toBe('/illust')
})

test('page 1 query is normalized with 308', async ({ request }) => {
  const response = await request.get('/blog?p=1', { maxRedirects: 0 })
  expect(response.status()).toBe(308)
  const location = new URL(response.headers()['location'], response.url())
  expect(location.pathname).toBe('/blog')
  expect(location.search).toBe('')
})

test('unknown query is dropped with 308', async ({ request }) => {
  const response = await request.get('/blog?foo=bar&p=2', { maxRedirects: 0 })
  expect(response.status()).toBe(308)
  const location = new URL(response.headers()['location'], response.url())
  expect(location.pathname).toBe('/blog')
  expect(location.search).toBe('?p=2')
})
