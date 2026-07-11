/**
 * KVプレビュー（draftKey互換）のドラフト参照テスト
 * admin-pages が書き込む atelierDraftRecord を fetcher 側が正しく検証・変換できることを確認する
 */
import { describe, it, expect } from 'vitest'
import type { atelierDraftRecord } from 'api-types'
import { getAtelierDraftFromKV } from '../src/d1'
import { parse } from '../src/parse'

// KVNamespace の get(key) だけを模したフェイク
function fakeKV(store: Record<string, string>): KVNamespace {
  return {
    get: async (key: string) => store[key] ?? null,
  } as unknown as KVNamespace
}

const draftRecord: atelierDraftRecord = {
  draftKey: 'valid-draft-key-123',
  row: {
    id: 'draft_illust',
    title: '下書きイラスト',
    src: 'https://r2.maretol.xyz/draft.png',
    object_position: 'center',
    description: '編集中の**説明文**です',
    description_format: 'markdown',
    status: 'DRAFT',
    created_at: '2026-07-11T00:00:00.000Z',
    updated_at: '2026-07-11T01:00:00.000Z',
    published_at: '2026-07-11T00:30:00.000Z',
    revised_at: '2026-07-11T01:00:00.000Z',
  },
  tags: [
    {
      id: 'vocaloid',
      tag: 'VOCALOID',
      type: ['作品'],
      createdAt: '2026-03-22T02:51:37.845Z',
      updatedAt: '2026-03-22T02:51:37.845Z',
      publishedAt: '2026-03-22T02:51:37.845Z',
      revisedAt: '2026-03-22T02:51:37.845Z',
    },
  ],
}

const kv = fakeKV({ draft_atelier_draft_illust: JSON.stringify(draftRecord) })

describe('getAtelierDraftFromKV', () => {
  it('draftKeyが一致した場合ドラフトをatelierResultとして返す', async () => {
    const result = await getAtelierDraftFromKV(kv, 'draft_illust', 'valid-draft-key-123')
    expect(result).not.toBeNull()
    expect(result?.id).toBe('draft_illust')
    expect(result?.title).toBe('下書きイラスト')
    expect(result?.tag_or_category[0].tag).toBe('VOCALOID')
    // markdownの説明文が配信時変換され、既存parse()でParsedContentにできる
    expect(result?.description).toBe('<p>編集中の<strong>説明文</strong>です</p>\n')
    const parsed = parse(result!.description)
    expect(parsed.contents_array[0].tag_name).toBe('p')
  })

  it('draftKeyが一致しない場合nullを返す（D1フォールバック）', async () => {
    const result = await getAtelierDraftFromKV(kv, 'draft_illust', 'wrong-key')
    expect(result).toBeNull()
  })

  it('ドラフトが存在しない場合nullを返す', async () => {
    const result = await getAtelierDraftFromKV(kv, 'no_such_illust', 'valid-draft-key-123')
    expect(result).toBeNull()
  })
})
