import { describe, it, expect } from 'vitest'
import { resolveHTTPURL } from '../src/url'

const base = 'https://example.com/blog/post?x=1'

describe('resolveHTTPURL', () => {
  it('絶対 URL はそのまま', () => {
    expect(resolveHTTPURL('https://cdn.example.net/a.png', base)).toBe('https://cdn.example.net/a.png')
  })

  it('ルート相対・ディレクトリ相対・プロトコル相対をページの URL を基準に解決する', () => {
    expect(resolveHTTPURL('/img/a.png', base)).toBe('https://example.com/img/a.png')
    expect(resolveHTTPURL('img/a.png', base)).toBe('https://example.com/blog/img/a.png')
    expect(resolveHTTPURL('//cdn.example.net/a.png', base)).toBe('https://cdn.example.net/a.png')
  })

  it('空・不正な URL・http(s) 以外は空文字', () => {
    expect(resolveHTTPURL('', base)).toBe('')
    expect(resolveHTTPURL('/a.png', 'not a url')).toBe('')
    expect(resolveHTTPURL('javascript:alert(1)', base)).toBe('')
    expect(resolveHTTPURL('data:image/png;base64,AAAA', base)).toBe('')
  })
})
