import { publishToRelays } from '../src/nostr'
import { describe, expect, test, vi } from 'vitest'
import type { Event } from 'nostr-tools/pure'

const relays = ['wss://a.example', 'wss://b.example', 'wss://c.example']
const event = { id: 'test' } as Event

// 引数のリレーごとに指定した Promise を返す SimplePool.publish の代用
function fakePool(promises: Promise<string>[]) {
  return { publish: vi.fn(() => promises) }
}

// setTimeout 経由で解決/拒否させ、他リレーの結果待ちが打ち切られないことを検証する
const later = <T>(fn: () => T, ms: number) =>
  new Promise<T>((resolve, reject) =>
    setTimeout(() => {
      try {
        resolve(fn())
      } catch (e) {
        reject(e)
      }
    }, ms)
  )

describe('publishToRelays', () => {
  test('1 リレーが先に失敗しても残りのリレーの結果を待って成功扱いにする', async () => {
    const promises = [
      later(() => {
        throw new Error('connection refused')
      }, 5),
      later(() => '', 30),
      later(() => '', 50),
    ]
    const pool = fakePool(promises)

    await expect(publishToRelays(pool, relays, event)).resolves.toBeUndefined()
    // allSettled なので全 Promise が確定してから戻る
    await expect(promises[1]).resolves.toBe('')
    await expect(promises[2]).resolves.toBe('')
    expect(pool.publish).toHaveBeenCalledWith(relays, event)
  })

  test('全リレーが失敗したら throw する', async () => {
    const pool = fakePool([
      Promise.reject(new Error('publish timed out')),
      Promise.reject(new Error('connection refused')),
      Promise.reject('blocked: rate limited'),
    ])

    await expect(publishToRelays(pool, relays, event)).rejects.toThrow('Failed to publish to all 3 nostr relays')
  })
})
