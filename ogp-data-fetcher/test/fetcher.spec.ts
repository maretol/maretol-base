import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchAndGetHTMLText } from '../src/fetcher'

// 「テスト」の Shift_JIS のバイト列
const SJIS_TEST = [0x83, 0x65, 0x83, 0x58, 0x83, 0x67]

// 取得先の応答。url はリダイレクト後の URL（Response のコンストラクタでは指定できないので上書きする）
function stubFetch(body: Uint8Array | string, contentType: string | undefined, url = 'https://example.com/page') {
  const headers: Record<string, string> = contentType === undefined ? {} : { 'content-type': contentType }
  const response = new Response(body, { status: 200, headers })
  Object.defineProperty(response, 'url', { value: url })
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => response),
  )
}

function sjisHTML(head: string): Uint8Array {
  const encoder = new TextEncoder()
  const before = encoder.encode(`<html><head>${head}<title>`)
  const after = encoder.encode('</title></head><body></body></html>')
  return new Uint8Array([...before, ...SJIS_TEST, ...after])
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchAndGetHTMLText', () => {
  it('header の charset が引用符付きでもデコードできる', async () => {
    stubFetch('<html><head><title>Quoted</title></head></html>', 'text/html; charset="utf-8"')
    const { title } = await fetchAndGetHTMLText('https://example.com/')
    expect(title).toBe('Quoted')
  })

  it('header の charset に従ってデコードする', async () => {
    stubFetch(sjisHTML(''), 'text/html; charset=Shift_JIS')
    const { title, text } = await fetchAndGetHTMLText('https://example.com/')
    expect(title).toBe('テスト')
    expect(text).toContain('<title>テスト</title>')
  })

  it('header に charset が無いときは meta の charset でデコードし直す', async () => {
    stubFetch(sjisHTML('<meta charset="shift_jis">'), 'text/html')
    const { title } = await fetchAndGetHTMLText('https://example.com/')
    expect(title).toBe('テスト')
  })

  it('header の charset が未知のラベルでも失敗せず UTF-8 で読む', async () => {
    stubFetch('<html><head><title>Fallback</title></head></html>', 'text/html; charset=bogus')
    const { title } = await fetchAndGetHTMLText('https://example.com/')
    expect(title).toBe('Fallback')
  })

  it('meta の charset が utf8（別名）のときはデコードし直さない', async () => {
    stubFetch('<html><head><meta charset="UTF8"><title>Alias</title></head></html>', undefined)
    const { title } = await fetchAndGetHTMLText('https://example.com/')
    expect(title).toBe('Alias')
  })

  it('リダイレクト後の URL を返し、title が無ければ No Page Title', async () => {
    stubFetch('<html><head></head></html>', 'text/html; charset=utf-8', 'https://example.com/moved')
    const result = await fetchAndGetHTMLText('https://example.com/')
    expect(result.url).toBe('https://example.com/moved')
    expect(result.title).toBe('No Page Title')
  })

  it('応答が ok でなければ例外', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404, statusText: 'Not Found' })),
    )
    await expect(fetchAndGetHTMLText('https://example.com/')).rejects.toThrow('Failed to fetch: Not Found')
  })
})
