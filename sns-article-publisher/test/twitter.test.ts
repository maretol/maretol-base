import { describe, expect, test } from 'vitest'
import { UploadImageMedia, TwitterAuthInfo, PostTweet } from '../src/twitter'
import fs from 'node:fs'

describe('UploadImageMedia', () => {
  const authInfo: TwitterAuthInfo = {
    apiKey: process.env.TWI_API_KEY || 'test-api-key',
    apiSecret: process.env.TWI_API_SECRET || 'test-api-secret',
    accessToken: process.env.TWI_ACCESS_TOKEN || 'test-access-token',
    accessTokenSecret: process.env.TWI_ACCESS_TOKEN_SECRET || 'test-access-token-secret',
  }

  const imageFileName = './test/cat2.webp'

  test.skip('upload image and post tweet', { timeout: 100000 }, async () => {
    const imageFile = fs.readFileSync(imageFileName)
    if (!imageFile) {
      throw new Error(`Image file ${imageFileName} not found`)
    }
    const imageBuffer = new Uint8Array(imageFile.buffer)

    const mediaID = await UploadImageMedia(authInfo, imageBuffer)

    console.log('Tweet posted successfully with media ID:', mediaID)
    expect(mediaID).toBeDefined()

    await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait for a second to ensure the tweet is posted

    const testTweet = {
      text: 'テスト猫',
      media: {
        mediaIds: [mediaID],
      },
    }

    await PostTweet(authInfo, [testTweet])

    expect(true).toBe(true)
  })

  test('normal post tweet', async () => {
    const testTweet = [
      {
        text: 'ツリーテスト parent',
      },
      {
        text: 'ツリーテスト child',
      },
    ]

    await PostTweet(authInfo, testTweet)

    expect(true).toBe(true)
  })
})
