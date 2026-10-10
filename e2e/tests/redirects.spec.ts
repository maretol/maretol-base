import { test, expect, type APIResponse } from '@playwright/test'

// URL の正規化（astro_design.md 4.5）。エッジのキャッシュのエントリが表記揺れで分かれないように、
// 末尾のスラッシュとクエリを決まった形へリダイレクトする。ブラウザ描画は不要なので request コンテキストで確認する。

// リダイレクト先の URL。Location が無いときに `/undefined` へ解決されて原因が読めなくなるのを防ぐため、先に有無を確かめる
function locationOf(response: APIResponse): URL {
  const location = response.headers()['location']
  if (!location) {
    throw new Error('Location header is missing')
  }
  return new URL(location, response.url())
}

test('trailing slash is removed with 301', async ({ request }) => {
  const response = await request.get('/illust/', { maxRedirects: 0 })
  expect(response.status()).toBe(301)
  expect(locationOf(response).pathname).toBe('/illust')
})

test('page 1 query is normalized with 308', async ({ request }) => {
  const response = await request.get('/blog?p=1', { maxRedirects: 0 })
  expect(response.status()).toBe(308)
  // リダイレクト自体はキャッシュさせない（クエリの数だけエントリが増えるのを防ぐ）
  expect(response.headers()['cache-control']).toContain('no-store')
  const location = locationOf(response)
  expect(location.pathname).toBe('/blog')
  expect(location.search).toBe('')
})

test('unknown query is dropped with 308', async ({ request }) => {
  const response = await request.get('/blog?foo=bar&p=2', { maxRedirects: 0 })
  expect(response.status()).toBe(308)
  expect(response.headers()['cache-control']).toContain('no-store')
  const location = locationOf(response)
  expect(location.pathname).toBe('/blog')
  expect(location.search).toBe('?p=2')
})
