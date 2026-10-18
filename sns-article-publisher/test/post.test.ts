import { postToTargets } from '../src/post'
import { describe, expect, test, vi } from 'vitest'

const allEnabled = { twitter: true, bluesky: true, misskey: true, nostr: true }

// setTimeout 経由で解決/拒否させ、確定したかどうかをフラグで観測できるようにする
function later<T>(fn: () => T, ms: number) {
  const state = { settled: false }
  const promise = new Promise<T>((resolve, reject) =>
    setTimeout(() => {
      state.settled = true
      try {
        resolve(fn())
      } catch (e) {
        reject(e)
      }
    }, ms)
  )
  return { promise, state }
}

describe('postToTargets', () => {
  test('有効な SNS へ並列に投稿し、成否を tasks の順に返す', async () => {
    const twitter = later(() => undefined, 50)
    const started: string[] = []
    // 直列だと twitter が確定してから bluesky が始まる。並列なら twitter が未確定のうちに始まる
    let twitterSettledWhenBlueskyStarted: boolean | null = null

    const results = await postToTargets(
      [
        {
          target: 'twitter',
          run: () => {
            started.push('twitter')
            return twitter.promise
          },
        },
        {
          target: 'bluesky',
          run: async () => {
            started.push('bluesky')
            twitterSettledWhenBlueskyStarted = twitter.state.settled
          },
        },
      ],
      allEnabled
    )

    expect(started).toEqual(['twitter', 'bluesky'])
    expect(twitterSettledWhenBlueskyStarted).toBe(false)
    expect(results).toEqual([
      { target: 'twitter', success: true },
      { target: 'bluesky', success: true },
    ])
  })

  test('1 つが失敗しても残りの確定を待ち、失敗した SNS だけ error 付きで返す', async () => {
    const bluesky = later(() => undefined, 30)
    const nostr = later(() => undefined, 50)

    const results = await postToTargets(
      [
        { target: 'twitter', run: () => Promise.reject(new Error('Twitter API request failed: 401')) },
        { target: 'bluesky', run: () => bluesky.promise },
        { target: 'misskey', run: () => Promise.reject('rate limited') },
        { target: 'nostr', run: () => nostr.promise },
      ],
      allEnabled
    )

    expect(bluesky.state.settled).toBe(true)
    expect(nostr.state.settled).toBe(true)
    expect(results).toEqual([
      { target: 'twitter', success: false, error: 'Twitter API request failed: 401' },
      { target: 'bluesky', success: true },
      { target: 'misskey', success: false, error: 'rate limited' },
      { target: 'nostr', success: true },
    ])
  })

  test('run が同期的に throw しても、その SNS の失敗として扱う', async () => {
    const results = await postToTargets(
      [
        {
          target: 'nostr',
          run: () => {
            throw new Error('Invalid nsec')
          },
        },
        { target: 'misskey', run: async () => undefined },
      ],
      allEnabled
    )

    expect(results).toEqual([
      { target: 'nostr', success: false, error: 'Invalid nsec' },
      { target: 'misskey', success: true },
    ])
  })

  test('無効な SNS は投稿せず、結果にも含めない', async () => {
    const misskey = vi.fn(async () => undefined)

    const results = await postToTargets(
      [
        { target: 'twitter', run: async () => undefined },
        { target: 'misskey', run: misskey },
      ],
      { ...allEnabled, misskey: false }
    )

    expect(misskey).not.toHaveBeenCalled()
    expect(results).toEqual([{ target: 'twitter', success: true }])
  })
})
