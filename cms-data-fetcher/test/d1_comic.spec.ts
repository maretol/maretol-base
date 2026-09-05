/**
 * D1レコード → bandeDessineeResult マッピングと comic ドラフト参照のテスト
 */
import { describe, it, expect } from 'vitest'
import type { bandeDessineeRow, bandeDessineeDraftRecord } from 'api-types'
import { toBandeDessineeResult, getBandeDessineeDraftFromKV, getBandeDessineesFromD1 } from '../src/d1'
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

describe('getBandeDessineesFromD1', () => {
  // JOIN済み行を模した公開済みマンガ（published_at降順）。2件がシリーズ dojin-republish、1件がシリーズなし
  const joinRows = [
    {
      ...baseRow,
      id: 'comic_a',
      series_id: 'dojin-republish',
      published_at: '2025-03-01T00:00:00.000Z',
      tag_name: '艦これ',
      series_name: '同人再録',
    },
    {
      ...baseRow,
      id: 'comic_b',
      series_id: null,
      published_at: '2025-02-01T00:00:00.000Z',
      tag_name: '艦これ',
      series_name: null,
    },
    {
      ...baseRow,
      id: 'comic_c',
      series_id: 'dojin-republish',
      published_at: '2025-01-01T00:00:00.000Z',
      tag_name: '艦これ',
      series_name: '同人再録',
    },
  ]

  // SQL文字列を見て series_id の絞り込みと LIMIT/OFFSET を再現する簡易D1モック
  const db = {
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => {
        const hasSeries = sql.includes('b.series_id = ?1')
        const matched = hasSeries ? joinRows.filter((r) => r.series_id === params[0]) : joinRows
        return {
          first: async () => ({ cnt: matched.length }),
          all: async () => {
            const [limit, offset] = (hasSeries ? params.slice(1) : params) as [number, number]
            return { results: matched.slice(offset, offset + limit) }
          },
        }
      },
    }),
  } as unknown as D1Database

  it('シリーズ未指定では公開済み全件を返す', async () => {
    const result = await getBandeDessineesFromD1(db, 0, 10)
    expect(result.total).toBe(3)
    expect(result.bandeDessinees.map((bd) => bd.id)).toEqual(['comic_a', 'comic_b', 'comic_c'])
  })

  it('シリーズ指定ではそのシリーズのマンガのみを返す（totalも絞り込み後の件数）', async () => {
    const result = await getBandeDessineesFromD1(db, 0, 10, 'dojin-republish')
    expect(result.total).toBe(2)
    expect(result.bandeDessinees.map((bd) => bd.id)).toEqual(['comic_a', 'comic_c'])
    expect(result.bandeDessinees[0].series).toEqual({ id: 'dojin-republish', series_name: '同人再録' })
  })

  it('シリーズ指定でもlimit/offsetが効く', async () => {
    const result = await getBandeDessineesFromD1(db, 1, 1, 'dojin-republish')
    expect(result.total).toBe(2)
    expect(result.bandeDessinees.map((bd) => bd.id)).toEqual(['comic_c'])
  })

  it('存在しないシリーズは空を返す', async () => {
    const result = await getBandeDessineesFromD1(db, 0, 10, 'no_such_series')
    expect(result).toEqual({ bandeDessinees: [], total: 0 })
  })
})
