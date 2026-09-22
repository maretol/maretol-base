import { publishToRelays } from '../src/nostr'
import { describe, expect, test, vi } from 'vitest'
import type { Event } from 'nostr-tools/pure'

const relays = ['wss://a.example', 'wss://b.example', 'wss://c.example']
const event = { id: 'test' } as Event

// 引数のリレーごとに指定した Promise を返す SimplePool.publish の代用
function fakePool(promises: Promise<string>[]) {
  return { publish: vi.fn(() => promises) }
}

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

describe('publishToRelays', () => {
  test('1 リレーが先に失敗しても残りのリレーの確定を待ってから成功扱いで戻る', async () => {
    const a = later(() => {
      throw new Error('connection refused')
    }, 5)
    const b = later(() => '', 30)
    const c = later(() => '', 50)
    const pool = fakePool([a.promise, b.promise, c.promise])

    await expect(publishToRelays(pool, relays, event)).resolves.toBeUndefined()
    // Promise.all だと a の reject 時点で戻ってしまい b, c は未確定のままになる
    expect(b.state.settled).toBe(true)
    expect(c.state.settled).toBe(true)
    expect(pool.publish).toHaveBeenCalledWith(relays, event)
  })

  test('全リレーが失敗したらリレーごとの理由を含めて throw する', async () => {
    const pool = fakePool([
      Promise.reject(new Error('publish timed out')),
      Promise.reject(new Error('connection refused')),
      Promise.reject('blocked: rate limited'),
    ])

    await expect(publishToRelays(pool, relays, event)).rejects.toThrow(
      'Failed to publish to all 3 nostr relays (wss://a.example: publish timed out, wss://b.example: connection refused, wss://c.example: blocked: rate limited)'
    )
  })

  test('リレーが空なら publish せずに throw する', async () => {
    const pool = fakePool([])

    await expect(publishToRelays(pool, [], event)).rejects.toThrow('No nostr relays configured')
    expect(pool.publish).not.toHaveBeenCalled()
  })
})
