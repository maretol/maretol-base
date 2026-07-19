/**
 * D1レコード → bandeDessineeResult マッピングと comic ドラフト参照のテスト
 */
import { describe, it, expect } from 'vitest'
import type { bandeDessineeRow, bandeDessineeDraftRecord } from 'api-types'
import { toBandeDessineeResult, getBandeDessineeDraftFromKV } from '../src/d1'
import { parse } from '../src/parse'

const baseRow: bandeDessineeRow = {
  id: 'the_merged_wind_has_come',
  title_name: 'The Merged Wind Has Come',
  publish_date: '2023-03-18T15:00:00.000Z',
  publish_event: '第1回海外艦オンリー',
  contents_url: 'https://bande-dessinee.maretol.xyz/the_merged_wind_has_come/index.json',
  next_id: null,
  previous_id: null,
  tag_id: 'kancolle',
  series_id: null,
  cover: 'test_001.png',
  back_cover: 'test_058.png',
  format: '["png"]',
  filename: 'test',
  first_page: 3,
  last_page: 56,
  first_left_right: '["left"]',
  description: '<p>Web再録です</p>',
  description_format: 'html',
  status: 'PUBLISH',
  created_at: '2024-12-30T02:35:17.937Z',
  updated_at: '2025-01-05T06:35:19.120Z',
  published_at: '2024-12-30T02:35:17.937Z',
  revised_at: '2025-01-05T06:35:19.120Z',
}

describe('toBandeDessineeResult', () => {
  it('HTMLレコードがmicroCMS互換の形になる（JSON配列カラムの展開込み）', () => {
    const result = toBandeDessineeResult(baseRow, { id: 'kancolle', tag_name: '艦これ' }, null)

    expect(result.id).toBe('the_merged_wind_has_come')
    expect(result.title_name).toBe('The Merged Wind Has Come')
    expect(result.publish_date).toBe('2023-03-18T15:00:00.000Z')
    expect(result.contents_url).toBe('https://bande-dessinee.maretol.xyz/the_merged_wind_has_come/index.json')
    expect(result.next_id).toBeUndefined()
    expect(result.tag).toEqual({ id: 'kancolle', tag_name: '艦これ' })
    expect(result.series).toBeUndefined()
    expect(result.format).toEqual(['png'])
    expect(result.first_left_right).toEqual(['left'])
    expect(result.first_page).toBe(3)
    expect(result.last_page).toBe(56)
    expect(result.description).toBe('<p>Web再録です</p>')
    expect(result.createdAt).toBe('2024-12-30T02:35:17.937Z')
    expect(result.publishedAt).toBe('2024-12-30T02:35:17.937Z')
  })

  it('シリーズ付きレコードでseriesが設定される', () => {
    const withSeries = { ...baseRow, series_id: 'dojin-republish' }
    const result = toBandeDessineeResult(
      withSeries,
      { id: 'kancolle', tag_name: '艦これ' },
      { id: 'dojin-republish', series_name: '同人再録' }
    )
    expect(result.series).toEqual({ id: 'dojin-republish', series_name: '同人再録' })
  })

  it('markdownレコードのdescriptionが互換HTMLになりparse()できる', () => {
    const mdRow: bandeDessineeRow = {
      ...baseRow,
      description: '新刊の**Web再録**です\n\n宜しくおねがいします',
      description_format: 'markdown',
    }
    const result = toBandeDessineeResult(mdRow, { id: 'kancolle', tag_name: '艦これ' }, null)
    expect(result.description).toBe('<p>新刊の<strong>Web再録</strong>です</p>\n<p>宜しくおねがいします</p>\n')
    const parsed = parse(result.description)
    expect(parsed.contents_array.map((c) => c.tag_name)).toEqual(['p', 'p'])
  })
})

describe('getBandeDessineeDraftFromKV', () => {
  const record: bandeDessineeDraftRecord = {
    draftKey: 'comic-draft-key',
    row: { ...baseRow, title_name: 'ドラフト版タイトル', status: 'DRAFT' },
    tag: { id: 'kancolle', tag_name: '艦これ' },
    series: null,
  }
  const kv = {
    get: async (key: string) =>
      key === 'draft_bande_dessinee_the_merged_wind_has_come' ? JSON.stringify(record) : null,
  } as unknown as KVNamespace

  it('draftKey一致でドラフトを返す', async () => {
    const result = await getBandeDessineeDraftFromKV(kv, 'the_merged_wind_has_come', 'comic-draft-key')
    expect(result?.title_name).toBe('ドラフト版タイトル')
  })

  it('draftKey不一致・不存在はnull', async () => {
    expect(await getBandeDessineeDraftFromKV(kv, 'the_merged_wind_has_come', 'wrong')).toBeNull()
    expect(await getBandeDessineeDraftFromKV(kv, 'no_such', 'comic-draft-key')).toBeNull()
  })
})
