/**
 * D1レコード → atelierResult マッピングのテスト
 * 特に description_format='markdown' のレコードが配信時に互換HTMLへ変換され、
 * 既存 parse() で ParsedContent になることを検証する
 */
import { describe, it, expect } from 'vitest'
import { toAtelierResult, toDeliveryHTML, type AtelierRow } from '../src/d1'
import { parse } from '../src/parse'

const baseRow: AtelierRow = {
  id: 'test_illust',
  title: 'テストイラスト',
  src: 'https://r2.maretol.xyz/test.png',
  object_position: 'center',
  description: '<p>HTML形式の説明文</p>',
  description_format: 'html',
  status: 'PUBLISH',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
  published_at: '2026-01-01T12:00:00.000Z',
  revised_at: '2026-01-02T00:00:00.000Z',
}

describe('toDeliveryHTML', () => {
  it('html形式はそのまま返す', () => {
    expect(toDeliveryHTML('<p>そのまま</p>', 'html')).toBe('<p>そのまま</p>')
  })

  it('markdown形式は互換HTMLに変換される', () => {
    expect(toDeliveryHTML('説明文の**強調**です', 'markdown')).toBe('<p>説明文の<strong>強調</strong>です</p>\n')
  })

  it('null・空文字は空文字を返す', () => {
    expect(toDeliveryHTML(null, 'markdown')).toBe('')
    expect(toDeliveryHTML('', 'html')).toBe('')
  })
})

describe('toAtelierResult', () => {
  it('HTMLレコードがmicroCMS互換の形になる', () => {
    const result = toAtelierResult(baseRow, [
      {
        id: 'kancolle',
        tag: '艦これ',
        type: ['作品'],
        createdAt: '2025-06-29T08:42:14.292Z',
        updatedAt: '2025-06-29T08:55:31.467Z',
        publishedAt: '2025-06-29T08:42:14.292Z',
        revisedAt: '2025-06-29T08:42:14.292Z',
      },
    ])

    expect(result.id).toBe('test_illust')
    expect(result.title).toBe('テストイラスト')
    expect(result.src).toBe('https://r2.maretol.xyz/test.png')
    expect(result.object_position).toBe('center')
    expect(result.description).toBe('<p>HTML形式の説明文</p>')
    expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z')
    expect(result.publishedAt).toBe('2026-01-01T12:00:00.000Z')
    expect(result.tag_or_category).toHaveLength(1)
    expect(result.tag_or_category[0].tag).toBe('艦これ')
    expect(result.tag_or_category[0].type).toEqual(['作品'])
  })

  it('markdownレコードのdescriptionが互換HTMLになりparse()でParsedContentにできる', () => {
    const mdRow: AtelierRow = {
      ...baseRow,
      description: '鉛筆＋コピー用紙\n\n**重音テト**はいいぞ',
      description_format: 'markdown',
    }
    const result = toAtelierResult(mdRow, [])

    expect(result.description).toBe('<p>鉛筆＋コピー用紙</p>\n<p><strong>重音テト</strong>はいいぞ</p>\n')

    // 既存フロー（index.ts）と同じく parse() に通せる
    const parsed = parse(result.description)
    expect(parsed.contents_array.map((c) => c.tag_name)).toEqual(['p', 'p'])
    expect(parsed.contents_array[0].text).toBe('鉛筆＋コピー用紙')
  })

  it('published_at が NULL の場合 created_at にフォールバックする', () => {
    const row: AtelierRow = { ...baseRow, published_at: null, revised_at: null }
    const result = toAtelierResult(row, [])
    expect(result.publishedAt).toBe(baseRow.created_at)
    expect(result.revisedAt).toBe(baseRow.updated_at)
  })
})
