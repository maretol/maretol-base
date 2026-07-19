/**
 * D1レコード → novelResult マッピングと novel ドラフト参照のテスト
 */
import { describe, it, expect } from 'vitest'
import type { novelRow, novelDraftRecord } from 'api-types'
import { toNovelResult, getNovelDraftFromKV } from '../src/d1'
import { parse } from '../src/parse'

const baseRow: novelRow = {
  id: 'the_first_novel',
  title_name: 'The First Novel',
  publish_date: '2026-05-10T15:00:00.000Z',
  publish_event: '架空イベント01',
  contents_url: 'https://novel.maretol.xyz/the_first_novel/body.txt',
  next_id: null,
  previous_id: null,
  tag_id: 'kancolle',
  series_id: null,
  cover: 'cover_001.png',
  description: '<p>書き下ろしです</p>',
  description_format: 'html',
  status: 'PUBLISH',
  created_at: '2026-06-30T02:35:17.937Z',
  updated_at: '2026-07-05T06:35:19.120Z',
  published_at: '2026-06-30T02:35:17.937Z',
  revised_at: '2026-07-05T06:35:19.120Z',
}

describe('toNovelResult', () => {
  it('HTMLレコードがAPI互換の形になる', () => {
    const result = toNovelResult(baseRow, { id: 'kancolle', tag_name: '艦これ' }, null)

    expect(result.id).toBe('the_first_novel')
    expect(result.title_name).toBe('The First Novel')
    expect(result.publish_date).toBe('2026-05-10T15:00:00.000Z')
    expect(result.contents_url).toBe('https://novel.maretol.xyz/the_first_novel/body.txt')
    expect(result.next_id).toBeUndefined()
    expect(result.tag).toEqual({ id: 'kancolle', tag_name: '艦これ' })
    expect(result.series).toBeUndefined()
    expect(result.cover).toBe('cover_001.png')
    expect(result.description).toBe('<p>書き下ろしです</p>')
    expect(result.createdAt).toBe('2026-06-30T02:35:17.937Z')
    expect(result.publishedAt).toBe('2026-06-30T02:35:17.937Z')
  })

  it('null許容カラムがundefinedに変換される', () => {
    const minimal: novelRow = { ...baseRow, publish_date: null, publish_event: null, cover: null }
    const result = toNovelResult(minimal, { id: 'kancolle', tag_name: '艦これ' }, null)
    expect(result.publish_date).toBeUndefined()
    expect(result.publish_event).toBeUndefined()
    expect(result.cover).toBeUndefined()
  })

  it('シリーズ付きレコードでseriesが設定される', () => {
    const withSeries = { ...baseRow, series_id: 'novel-series-01' }
    const result = toNovelResult(
      withSeries,
      { id: 'kancolle', tag_name: '艦これ' },
      { id: 'novel-series-01', series_name: '連作シリーズ' }
    )
    expect(result.series).toEqual({ id: 'novel-series-01', series_name: '連作シリーズ' })
  })

  it('markdownレコードのdescriptionが互換HTMLになりparse()できる', () => {
    const mdRow: novelRow = {
      ...baseRow,
      description: '新作の**書き下ろし**です\n\n宜しくおねがいします',
      description_format: 'markdown',
    }
    const result = toNovelResult(mdRow, { id: 'kancolle', tag_name: '艦これ' }, null)
    expect(result.description).toBe('<p>新作の<strong>書き下ろし</strong>です</p>\n<p>宜しくおねがいします</p>\n')
    const parsed = parse(result.description)
    expect(parsed.contents_array.map((c) => c.tag_name)).toEqual(['p', 'p'])
  })
})

describe('getNovelDraftFromKV', () => {
  const record: novelDraftRecord = {
    draftKey: 'novel-draft-key',
    row: { ...baseRow, title_name: 'ドラフト版タイトル', status: 'DRAFT' },
    tag: { id: 'kancolle', tag_name: '艦これ' },
    series: null,
  }
  const kv = {
    get: async (key: string) => (key === 'draft_novel_the_first_novel' ? JSON.stringify(record) : null),
  } as unknown as KVNamespace

  it('draftKey一致でドラフトを返す', async () => {
    const result = await getNovelDraftFromKV(kv, 'the_first_novel', 'novel-draft-key')
    expect(result?.title_name).toBe('ドラフト版タイトル')
  })

  it('draftKey不一致・不存在はnull', async () => {
    expect(await getNovelDraftFromKV(kv, 'the_first_novel', 'wrong')).toBeNull()
    expect(await getNovelDraftFromKV(kv, 'no_such', 'novel-draft-key')).toBeNull()
  })
})
