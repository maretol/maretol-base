import { describe, it, expect } from 'vitest'
import { GetMetadataRewriter } from '../src/rewriter'

async function analyze(html: string) {
  const rewriter = new GetMetadataRewriter()
  rewriter.setCharsetHandler()
  await rewriter.execute(html)
  return { title: rewriter.getTitle(), charset: rewriter.getCharset() }
}

describe('GetMetadataRewriter の title', () => {
  it('チャンクに分かれて届く長いタイトルを最後まで連結する', async () => {
    const title = 'とても長いページのタイトルで、チャンクの境界をまたぐことを確かめる'
    const { title: got } = await analyze(`<html><head><title>${title}</title></head><body></body></html>`)
    expect(got).toBe(title)
  })

  it('body 内の svg の title で上書きされない', async () => {
    const { title } = await analyze(
      '<html><head><title>Page</title></head><body><svg><title>GitHub logo</title></svg></body></html>',
    )
    expect(title).toBe('Page')
  })

  it('実体参照をデコードし、前後の空白を落とす', async () => {
    const { title } = await analyze(
      '<html><head><title>\n  Tom &amp; Jerry &#x2014; &quot;S1&quot;\n</title></head></html>',
    )
    expect(title).toBe('Tom & Jerry — "S1"')
  })

  it('head に title が複数あるときは最初のものを使う', async () => {
    const { title } = await analyze('<html><head><title>First</title><title>Second</title></head></html>')
    expect(title).toBe('First')
  })

  it('title が無い・空のときは undefined', async () => {
    expect((await analyze('<html><head></head><body><p>x</p></body></html>')).title).toBeUndefined()
    expect((await analyze('<html><head><title> </title></head></html>')).title).toBeUndefined()
  })
})

describe('GetMetadataRewriter の charset', () => {
  it('meta charset を小文字で返す', async () => {
    expect((await analyze('<html><head><meta charset="Shift_JIS"></head></html>')).charset).toBe('shift_jis')
  })

  it('http-equiv の content から引用符付きや大文字でも読める', async () => {
    const html = '<html><head><meta HTTP-EQUIV="Content-Type" content=\'text/html; charset="EUC-JP"\'></head></html>'
    expect((await analyze(html)).charset).toBe('euc-jp')
  })

  it('指定が無いときは undefined', async () => {
    expect(
      (await analyze('<html><head><meta name="viewport" content="width=device-width"></head></html>')).charset,
    ).toBeUndefined()
  })
})
