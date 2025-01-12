import { describe, it, expect } from 'vitest'
import { getPOption } from '../src/parse'

describe('parse_getPOptionのテスト', () => {
  it('通常テキストの場合', () => {
    const text = 'test text'
    const result = getPOption(text)
    expect(result).toBe('normal')
  })
  it('空文字の場合', () => {
    const text = ''
    const result = getPOption(text)
    expect(result).toBe('empty')
  })
  it('画像の場合', () => {
    const text = 'https://r2.maretol.xyz/test.png'
    const result = getPOption(text)
    expect(result).toBe('image')
  })
  it('写真の場合', () => {
    const text = 'https://photos.maretol.xyz/test.jpg'
    const result = getPOption(text)
    expect(result).toBe('photo')
  })
  it('写真（スクリーンショット）の場合', () => {
    const text = 'https://capture.maretol.xyz/test.jpg'
    const result = getPOption(text)
    expect(result).toBe('photo')
  })
  it('写真でサブテキストがあった場合', () => {
    const text = 'https://photos.maretol.xyz/test.jpg@@subtext_key::subtext_value@@subtext_key2::サブテキスト'
    const result = getPOption(text)
    expect(result).toBe('photo')
  })
  it('漫画リンクの場合', () => {
    const text = 'https://www.maretol.xyz/comics/test'
    const result = getPOption(text)
    expect(result).toBe('comic')
  })
  it('YouTubeリンクの場合', () => {
    const text = 'https://www.youtube.com/watch?v=test'
    const result = getPOption(text)
    expect(result).toBe('youtube')
  })
  it('Youtube短縮URLリンクの場合', () => {
    const text = 'https://youtu.be/test'
    const result = getPOption(text)
    expect(result).toBe('youtube')
  })
  it('Twitterリンクの場合', () => {
    const text = 'https://twitter.com/test'
    const result = getPOption(text)
    expect(result).toBe('twitter')
  })
  it('Twitterリンク（wwwあり）の場合', () => {
    const text = 'https://www.twitter.com/test'
    const result = getPOption(text)
    expect(result).toBe('twitter')
  })
  it('Xリンクの場合', () => {
    const text = 'https://x.com/test'
    const result = getPOption(text)
    expect(result).toBe('twitter')
  })
  it('Amazonリンクの場合', () => {
    const text = 'https://www.amazon.co.jp/test'
    const result = getPOption(text)
    expect(result).toBe('amazon')
  })
  it('Amazon短縮URLリンクの場合', () => {
    const text = 'https://amzn.to/test'
    const result = getPOption(text)
    expect(result).toBe('amazon')
  })
  it('ブログリンクの場合', () => {
    const text = 'https://www.maretol.xyz/blog/test'
    const result = getPOption(text)
    expect(result).toBe('blog')
  })
  it('artifactリンクの場合', () => {
    const text = 'https://www.maretol.xyz/artifacts/test'
    const result = getPOption(text)
    expect(result).toBe('artifact')
  })
  it('その他のURLの場合', () => {
    const text = 'https://example.com'
    const result = getPOption(text)
    expect(result).toBe('url')
  })
  it('コマンド入力の場合', () => {
    const text = '/test_command'
    const result = getPOption(text)
    expect(result).toBe('test_command')
  })
})
