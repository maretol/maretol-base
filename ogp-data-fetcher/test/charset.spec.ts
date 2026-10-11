import { describe, it, expect } from 'vitest'
import { createTextDecoder, parseCharsetParam } from '../src/charset'

describe('parseCharsetParam', () => {
  it('content-type の charset を小文字で返す', () => {
    expect(parseCharsetParam('text/html; charset=UTF-8')).toBe('utf-8')
    expect(parseCharsetParam('text/html;charset=Shift_JIS')).toBe('shift_jis')
  })

  it('引用符付き・空白入り・大文字の charset= も読める', () => {
    expect(parseCharsetParam('text/html; charset="utf-8"')).toBe('utf-8')
    expect(parseCharsetParam('text/html; Charset = "EUC-JP" ; boundary=x')).toBe('euc-jp')
  })

  it('charset が無いときは undefined', () => {
    expect(parseCharsetParam('text/html')).toBeUndefined()
    expect(parseCharsetParam(null)).toBeUndefined()
    expect(parseCharsetParam(undefined)).toBeUndefined()
  })
})

describe('createTextDecoder', () => {
  it('既知のラベルはそのエンコーディングになる（別名も正規化される）', () => {
    expect(createTextDecoder('shift_jis').encoding).toBe('shift_jis')
    expect(createTextDecoder('x-sjis').encoding).toBe('shift_jis')
    expect(createTextDecoder('utf8').encoding).toBe('utf-8')
  })

  it('未知のラベルと未指定は UTF-8 になる', () => {
    expect(createTextDecoder('bogus-charset').encoding).toBe('utf-8')
    expect(createTextDecoder(undefined).encoding).toBe('utf-8')
  })
})
