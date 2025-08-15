import NoteMisskey from '../src/misskey'
import { expect, test } from 'vitest'

test('misskey post', async () => {
  const apiToken = process.env.MISSKEY_API_TOKEN

  if (!apiToken) {
    console.error('Misskey API token is not set in environment variables.')
    throw new Error('Misskey API token is not set')
  }

  const authInfo = {
    apiToken,
  }

  const note = 'テスト投稿 : Maretol Base\nhttps://www.maretol.xyz'

  await NoteMisskey(authInfo, note)

  console.log('Misskey post successful')
  expect(true).toBe(true) // 簡単な成功確認
})
