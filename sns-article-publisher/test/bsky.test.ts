import { expect, test } from 'vitest'
import PostBlueSky from '../src/bluesky'

test('bsky post', async () => {
  const username = process.env.BSKY_USERNAME
  const password = process.env.BSKY_PASSWORD

  if (!username || !password) {
    console.error('BlueSky credentials are not set in environment variables.')
    expect.fail('BlueSky credentials are not set')
  }

  const authInfo = {
    username,
    password,
  }
  const ogp = {
    title: 'テスト投稿',
    description: 'これはテスト投稿です。',
    url: 'https://www.maretol.xyz',
    image: null,
  }
  const post = 'テスト投稿 : Maretol Base'

  await PostBlueSky(authInfo, post, ogp)

  console.log('BlueSky post successful')
  expect(true).toBe(true) // 簡単な成功確認
})
