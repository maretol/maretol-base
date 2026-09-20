/**
 * D1レコード → bandeDessineeResult マッピングと comic ドラフト参照のテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { bandeDessineeRow, bandeDessineeDraftRecord } from 'api-types'
import {
  toBandeDessineeResult,
  getBandeDessineeDraftFromKV,
  getBandeDessineesFromD1,
  getBandeDessineeFromD1,
  hideUnpublishedNeighbors,
} from '../src/d1'
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

// JOIN済み行を模したマンガ。公開済み3件（published_at降順で comic_a, comic_b, comic_c）と、未公開の comic_draft / comic_closed
// 前後の巻のチェーン: comic_c → comic_a → comic_draft（下書き）、comic_c の前は comic_closed（非公開）
const joinRows = [
  {
    ...baseRow,
    id: 'comic_a',
    series_id: 'dojin-republish',
    previous_id: 'comic_c',
    next_id: 'comic_draft',
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
    previous_id: 'comic_closed',
    next_id: 'comic_a',
    published_at: '2025-01-01T00:00:00.000Z',
    tag_name: '艦これ',
    series_name: '同人再録',
  },
  {
    ...baseRow,
    id: 'comic_draft',
    series_id: 'dojin-republish',
    previous_id: 'comic_a',
    status: 'DRAFT',
    published_at: null,
    tag_name: '艦これ',
    series_name: '同人再録',
  },
  {
    ...baseRow,
    id: 'comic_closed',
    series_id: 'dojin-republish',
    next_id: 'comic_c',
    status: 'CLOSED',
    published_at: '2024-12-01T00:00:00.000Z',
    tag_name: '艦これ',
    series_name: '同人再録',
  },
]
const publishedIDs = new Set(joinRows.filter((row) => row.status === 'PUBLISH').map((row) => row.id))

// SQL中の ?N プレースホルダを番号で bind 値に対応付け、公開サイト向けクエリ（status・series_id・id の絞り込み、LIMIT/OFFSET、
// 前後の巻の公開判定 EXISTS、IN句）を再現する簡易D1モック
// 位置ではなく番号で解決することで、プレースホルダ番号と bind 順のずれを検出できるようにしている
const prepare = vi.fn((sql: string) => ({
  bind: (...params: unknown[]) => {
    const resolveIndex = (index: number): unknown => {
      if (index < 1 || index > params.length) {
        throw new Error(`placeholder ?${index} is out of range (bound params: ${params.length})`)
      }
      return params[index - 1]
    }
    const resolvePlaceholder = (pattern: RegExp): unknown => {
      const found = sql.match(pattern)
      return found ? resolveIndex(Number(found[1])) : undefined
    }

    // IN句: 列挙されたプレースホルダを全て解決し、bind した値が漏れなく参照されていることも検査する
    const inClause = sql.match(/IN \(([^)]*)\)/)
    if (inClause) {
      const indexes = [...inClause[1].matchAll(/\?(\d+)/g)].map((m) => Number(m[1]))
      if (new Set(indexes).size !== params.length) {
        throw new Error(`IN clause references ${indexes.join(',')} but ${params.length} params are bound`)
      }
      const ids = indexes.map(resolveIndex)
      const matched = joinRows.filter((row) => ids.includes(row.id))
      return {
        all: async () => ({
          results: (sql.includes("status = 'PUBLISH'") ? matched.filter((row) => publishedIDs.has(row.id)) : matched).map(
            (row) => ({ id: row.id })
          ),
        }),
      }
    }

    let matched = joinRows
    if (sql.includes("b.status = 'PUBLISH'")) {
      matched = matched.filter((row) => row.status === 'PUBLISH')
    }
    const seriesID = resolvePlaceholder(/b\.series_id = \?(\d+)/)
    if (seriesID !== undefined) {
      matched = matched.filter((row) => row.series_id === seriesID)
    }
    const contentID = resolvePlaceholder(/b\.id = \?(\d+)/)
    if (contentID !== undefined) {
      matched = matched.filter((row) => row.id === contentID)
    }
    // EXISTS(...) AS next_published / previous_published を SELECT している場合だけ 0/1 を付ける
    const withNeighborFlags = (row: (typeof joinRows)[number]) => ({
      ...row,
      ...(sql.includes('AS next_published')
        ? { next_published: row.next_id !== null && publishedIDs.has(row.next_id) ? 1 : 0 }
        : {}),
      ...(sql.includes('AS previous_published')
        ? { previous_published: row.previous_id !== null && publishedIDs.has(row.previous_id) ? 1 : 0 }
        : {}),
    })
    return {
      first: async () => (sql.includes('COUNT(*)') ? { cnt: matched.length } : (matched.map(withNeighborFlags)[0] ?? null)),
      all: async () => {
        const limit = resolvePlaceholder(/LIMIT \?(\d+)/)
        const offset = resolvePlaceholder(/OFFSET \?(\d+)/)
        if (typeof limit !== 'number' || typeof offset !== 'number') {
          throw new Error(`LIMIT/OFFSET must be bound as numbers (got ${String(limit)}, ${String(offset)})`)
        }
        return { results: matched.slice(offset, offset + limit).map(withNeighborFlags) }
      },
    }
  },
}))
const db = { prepare } as unknown as D1Database

beforeEach(() => {
  prepare.mockClear()
})

describe('getBandeDessineesFromD1', () => {
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

  it('一覧でも未公開の前後の巻のIDは伏せる（公開済みは残す）', async () => {
    const result = await getBandeDessineesFromD1(db, 0, 10, 'dojin-republish')
    const [comicA, comicC] = result.bandeDessinees
    expect(comicA.previous_id).toBe('comic_c')
    expect(comicA.next_id).toBeUndefined() // comic_draft は下書き
    expect(comicC.next_id).toBe('comic_a')
    expect(comicC.previous_id).toBeUndefined() // comic_closed は非公開
  })
})

describe('getBandeDessineeFromD1', () => {
  it('公開済みのマンガを1クエリで取得し、未公開の前後の巻のIDは伏せる', async () => {
    const result = await getBandeDessineeFromD1(db, 'comic_a')
    expect(result.id).toBe('comic_a')
    expect(result.series).toEqual({ id: 'dojin-republish', series_name: '同人再録' })
    expect(result.previous_id).toBe('comic_c')
    expect(result.next_id).toBeUndefined()
    expect(prepare).toHaveBeenCalledTimes(1)
  })

  it('未公開・存在しないマンガはエラーになる', async () => {
    await expect(getBandeDessineeFromD1(db, 'comic_draft')).rejects.toThrow('bande dessinee not found: comic_draft')
    await expect(getBandeDessineeFromD1(db, 'no_such')).rejects.toThrow('bande dessinee not found: no_such')
  })
})

// KVのドラフト（adminが保存した行そのまま）向けの伏せ処理
describe('hideUnpublishedNeighbors', () => {
  const tag = { id: 'kancolle', tag_name: '艦これ' }
  const toContent = (next_id: string | null, previous_id: string | null) =>
    toBandeDessineeResult({ ...baseRow, next_id, previous_id }, tag, null)

  it('公開済みの前後の巻はそのまま残す', async () => {
    const result = await hideUnpublishedNeighbors(db, toContent('comic_a', 'comic_c'))
    expect(result.next_id).toBe('comic_a')
    expect(result.previous_id).toBe('comic_c')
  })

  it('下書きの次の巻はIDを伏せる（公開済みの前の巻は残す）', async () => {
    const result = await hideUnpublishedNeighbors(db, toContent('comic_draft', 'comic_a'))
    expect(result.next_id).toBeUndefined()
    expect(result.previous_id).toBe('comic_a')
  })

  it('CLOSED・存在しない巻も伏せる', async () => {
    const result = await hideUnpublishedNeighbors(db, toContent('no_such', 'comic_closed'))
    expect(result.next_id).toBeUndefined()
    expect(result.previous_id).toBeUndefined()
  })

  it('片方だけ設定されていてもプレースホルダと bind が対応する', async () => {
    const result = await hideUnpublishedNeighbors(db, toContent(null, 'comic_a'))
    expect(result.next_id).toBeUndefined()
    expect(result.previous_id).toBe('comic_a')
    expect(prepare).toHaveBeenCalledTimes(1)
  })

  it('前後の巻がなければ問い合わせずにそのまま返す', async () => {
    const content = toContent(null, null)
    const result = await hideUnpublishedNeighbors(db, content)
    expect(result).toBe(content)
    expect(prepare).not.toHaveBeenCalled()
  })
})
