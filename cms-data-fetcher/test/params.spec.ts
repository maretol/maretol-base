/**
 * 一覧取得のパラメータの解釈（limit / offset / tag_id）のテスト（issue #1307）
 */
import { describe, it, expect } from 'vitest'
import { parseLimit, parseOffset, parseTagIDs, DEFAULT_LIMIT, MAX_LIMIT } from '../src/params'

describe('parseLimit', () => {
  it('1〜MAX_LIMIT の整数はそのまま', () => {
    expect(parseLimit('1')).toBe(1)
    expect(parseLimit('20')).toBe(20)
    expect(parseLimit(String(MAX_LIMIT))).toBe(MAX_LIMIT)
  })
  it('MAX_LIMIT 超は MAX_LIMIT に丸める', () => {
    expect(parseLimit(String(MAX_LIMIT + 1))).toBe(MAX_LIMIT)
    expect(parseLimit('200')).toBe(MAX_LIMIT)
  })
  it('未指定・0 以下・小数・数値でない文字列は既定値', () => {
    for (const value of [undefined, null, '', ' ', '0', '-1', '1.9', 'abc']) {
      expect(parseLimit(value), `limit=${String(value)}`).toBe(DEFAULT_LIMIT)
    }
  })
})

describe('parseOffset', () => {
  it('0 以上の整数はそのまま', () => {
    expect(parseOffset('0')).toBe(0)
    expect(parseOffset('5')).toBe(5)
    expect(parseOffset('200')).toBe(200)
  })
  it('未指定・負数・小数・数値でない文字列は 0', () => {
    for (const value of [undefined, null, '', '-5', '1.5', 'abc']) {
      expect(parseOffset(value), `offset=${String(value)}`).toBe(0)
    }
  })
})

describe('parseTagIDs', () => {
  it('1 つの ID', () => {
    expect(parseTagIDs('7qhnkdw6s')).toEqual(['7qhnkdw6s'])
  })
  it('+ 区切りで複数の ID', () => {
    expect(parseTagIDs('7qhnkdw6s+7lb3i2nz6')).toEqual(['7qhnkdw6s', '7lb3i2nz6'])
  })
  it('生の + が空白にデコードされた形も区切りとして扱う', () => {
    expect(parseTagIDs('7qhnkdw6s 7lb3i2nz6')).toEqual(['7qhnkdw6s', '7lb3i2nz6'])
  })
  it('重複は 1 つにする', () => {
    expect(parseTagIDs('7qhnkdw6s+7qhnkdw6s')).toEqual(['7qhnkdw6s'])
  })
  it('空の要素は落とす', () => {
    expect(parseTagIDs('7qhnkdw6s+')).toEqual(['7qhnkdw6s'])
    expect(parseTagIDs('+7qhnkdw6s')).toEqual(['7qhnkdw6s'])
    expect(parseTagIDs('++')).toEqual([])
  })
  it('未指定・空文字は空', () => {
    expect(parseTagIDs(undefined)).toEqual([])
    expect(parseTagIDs(null)).toEqual([])
    expect(parseTagIDs('')).toEqual([])
  })
  it('配列（RPC）も同じく空と重複を落とす', () => {
    expect(parseTagIDs(['7qhnkdw6s', '', '7qhnkdw6s', ' 7lb3i2nz6 '])).toEqual(['7qhnkdw6s', '7lb3i2nz6'])
  })
})
