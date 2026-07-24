import { describe, it, expect } from 'vitest'
import { parseNovelText } from './parseNovelText'

describe('parseNovelText - 記法変換', () => {
  it('ルビ記法を ruby 要素へ変換する', () => {
    expect(parseNovelText('[[rb:漢字 > かんじ]]')).toBe(
      '<p lang="ja"><ruby>漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby></p>'
    )
  })

  it('ルビの区切り前後の空白を正規化する', () => {
    expect(parseNovelText('[[rb:難読  >  なんどく]]')).toBe(
      '<p lang="ja"><ruby>難読<rp>(</rp><rt>なんどく</rt><rp>)</rp></ruby></p>'
    )
  })

  it('太字・斜体記法を strong/em へ変換する', () => {
    expect(parseNovelText('[b:太字]と[i:斜体]')).toBe('<p lang="ja"><strong>太字</strong>と<em>斜体</em></p>')
  })
})

describe('parseNovelText - 改行整形', () => {
  it('1 行を 1 つの p 要素として扱い、空行は br、連続空行は連続 br になる', () => {
    expect(parseNovelText('一行目\n\n二行目\n\n\n三行目')).toBe(
      '<p lang="ja">一行目</p><br><p lang="ja">二行目</p><br><br><p lang="ja">三行目</p>'
    )
  })

  it('CRLF 改行も LF として扱う', () => {
    expect(parseNovelText('A\r\nB')).toBe('<p lang="ja">A</p><p lang="ja">B</p>')
  })

  it('空入力は空文字を返す', () => {
    expect(parseNovelText('')).toBe('')
  })
})

describe('parseNovelText - XSS 無害化', () => {
  it('生の HTML タグはエスケープされる', () => {
    const r = parseNovelText('<script>alert(1)</script>')
    expect(r).toContain('&lt;script&gt;')
    expect(r).not.toContain('<script>')
  })

  it('記法内に埋め込まれた HTML もエスケープされる', () => {
    const r = parseNovelText('[b:<img src=x onerror=alert(1)>]')
    expect(r).toContain('<strong>&lt;img')
    expect(r).not.toContain('<img')
  })

  it('アンパサンドを多重エスケープしない', () => {
    expect(parseNovelText('A & B')).toBe('<p lang="ja">A &amp; B</p>')
  })
})

describe('parseNovelText - 未対応/不正記法の保持', () => {
  it('区切りのないルビはプレーンテキストとして保持する', () => {
    expect(parseNovelText('[[rb:漢字]]')).toBe('<p lang="ja">[[rb:漢字]]</p>')
  })

  it('未知の記法はプレーンテキストとして保持する', () => {
    expect(parseNovelText('[x:なにか]')).toBe('<p lang="ja">[x:なにか]</p>')
  })
})
