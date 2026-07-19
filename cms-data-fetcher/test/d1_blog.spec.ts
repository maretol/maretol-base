/**
 * D1レコード → blog API結果型マッピングと blog ドラフト参照のテスト
 */
import { describe, it, expect } from 'vitest'
import type { blogContentRow, blogCategoryRow, blogContentDraftRecord } from 'api-types'
import {
  toContentsAPIResult,
  toCategoryAPIResult,
  getBlogContentDraftFromKV,
  getBlogSecretMetaFromDraft,
  getBlogAdjacentContentsFromD1,
} from '../src/d1_blog'
import { parse } from '../src/parse'

const categoryRow: blogCategoryRow = {
  id: '7qhnkdw6s',
  name: '日記',
  sort_order: 0,
  created_at: '2025-02-24T03:53:52.155Z',
  updated_at: '2025-06-29T01:38:23.68Z',
  published_at: '2025-02-24T03:53:52.155Z',
  revised_at: '2025-02-24T03:53:52.155Z',
}

const baseRow: blogContentRow = {
  id: 'test_article',
  title: 'テスト記事',
  content: '<p>本文です</p><p>https://r2.maretol.xyz/test.png@@caption::画像</p>',
  content_format: 'html',
  ogp_image: 'https://r2.maretol.xyz/ogp.png',
  sns_text: 'SNS投稿文',
  is_secret: 0,
  secret_code: null,
  status: 'PUBLISH',
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-02T00:00:00.000Z',
  published_at: '2026-07-01T12:00:00.000Z',
  revised_at: '2026-07-02T00:00:00.000Z',
}

describe('toContentsAPIResult', () => {
  it('HTMLレコードがmicroCMS互換の形になる', () => {
    const result = toContentsAPIResult(baseRow, [toCategoryAPIResult(categoryRow)])
    expect(result.id).toBe('test_article')
    expect(result.title).toBe('テスト記事')
    expect(result.content).toBe('<p>本文です</p><p>https://r2.maretol.xyz/test.png@@caption::画像</p>')
    expect(result.ogp_image).toBe('https://r2.maretol.xyz/ogp.png')
    expect(result.categories).toHaveLength(1)
    expect(result.categories[0].name).toBe('日記')
    expect(result.is_secret).toBe(false)
    expect(result.publishedAt).toBe('2026-07-01T12:00:00.000Z')
    // secret_code / sns_text はAPIレスポンスに含めない
    expect('secret_code' in result).toBe(false)
    expect('sns_text' in result).toBe(false)
  })

  it('markdownレコードのcontentが互換HTMLになりparse()できる', () => {
    const mdRow: blogContentRow = {
      ...baseRow,
      content: '# 見出し@@index_target\n\n本文の**強調**\n\nhttps://r2.maretol.xyz/img.png@@caption::写真',
      content_format: 'markdown',
    }
    const result = toContentsAPIResult(mdRow, [])
    const parsed = parse(result.content)
    expect(parsed.contents_array.map((c) => c.tag_name)).toEqual(['h1', 'p', 'p'])
    expect(parsed.table_of_contents).toHaveLength(1)
    expect(parsed.contents_array[2].p_option).toBe('image')
    expect(parsed.contents_array[2].sub_texts).toEqual({ caption: '写真' })
  })

  it('is_secret=1 の記事は is_secret: true になる', () => {
    const secretRow: blogContentRow = { ...baseRow, is_secret: 1, secret_code: 'himitsu' }
    const result = toContentsAPIResult(secretRow, [])
    expect(result.is_secret).toBe(true)
    expect('secret_code' in result).toBe(false)
  })
})

describe('getBlogAdjacentContentsFromD1', () => {
  // 公開記事の並び（published_at昇順）: old_article < base < new_article
  // secret_article は base と new_article の間だが is_secret=1 のためナビに出ない想定
  const publishedRows = [
    { id: 'old_article', title: '古い記事', published_at: '2026-07-01T00:00:00.000Z', is_secret: 0 },
    { id: 'base_article', title: '基準記事', published_at: '2026-07-05T00:00:00.000Z', is_secret: 0 },
    { id: 'secret_article', title: '限定公開記事', published_at: '2026-07-07T00:00:00.000Z', is_secret: 1 },
    { id: 'new_article', title: '新しい記事', published_at: '2026-07-10T00:00:00.000Z', is_secret: 0 },
  ]

  // SQL文字列を見て挙動を切り替える簡易D1モック
  const db = {
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => ({
        first: async () => {
          if (sql.includes('WHERE id = ?1')) {
            const row = publishedRows.find((r) => r.id === params[0])
            return row ? { id: row.id, published_at: row.published_at } : null
          }
          const [publishedAt, id] = params as [string, string]
          const isPrev = sql.includes('< (?1, ?2)')
          const candidates = publishedRows
            .filter((r) => r.is_secret === 0)
            .filter((r) =>
              isPrev
                ? r.published_at < publishedAt || (r.published_at === publishedAt && r.id < id)
                : r.published_at > publishedAt || (r.published_at === publishedAt && r.id > id)
            )
            .sort((a, b) => (a.published_at < b.published_at ? -1 : 1))
          const row = isPrev ? candidates[candidates.length - 1] : candidates[0]
          return row ? { id: row.id, title: row.title } : null
        },
      }),
    }),
  } as unknown as D1Database

  it('前後の公開記事を返す（限定公開記事はスキップされる）', async () => {
    const result = await getBlogAdjacentContentsFromD1(db, 'base_article')
    expect(result.prev).toEqual({ id: 'old_article', title: '古い記事' })
    expect(result.next).toEqual({ id: 'new_article', title: '新しい記事' })
  })

  it('最古・最新の記事では片側がnullになる', async () => {
    const oldest = await getBlogAdjacentContentsFromD1(db, 'old_article')
    expect(oldest.prev).toBeNull()
    expect(oldest.next).toEqual({ id: 'base_article', title: '基準記事' })

    const newest = await getBlogAdjacentContentsFromD1(db, 'new_article')
    expect(newest.prev).toEqual({ id: 'base_article', title: '基準記事' })
    expect(newest.next).toBeNull()
  })

  it('基準記事が存在しない場合は両方null', async () => {
    const result = await getBlogAdjacentContentsFromD1(db, 'no_such_article')
    expect(result).toEqual({ prev: null, next: null })
  })
})

describe('blogドラフトのKV参照', () => {
  const record: blogContentDraftRecord = {
    draftKey: 'blog-draft-key',
    row: { ...baseRow, title: 'ドラフト版タイトル', is_secret: 1, secret_code: 'draft-secret', status: 'DRAFT' },
    categories: [categoryRow],
  }
  const kv = {
    get: async (key: string) => (key === 'draft_blog_test_article' ? JSON.stringify(record) : null),
  } as unknown as KVNamespace

  it('draftKey一致でドラフトを返す（カテゴリ込み）', async () => {
    const result = await getBlogContentDraftFromKV(kv, 'test_article', 'blog-draft-key')
    expect(result?.title).toBe('ドラフト版タイトル')
    expect(result?.categories[0].name).toBe('日記')
  })

  it('draftKey不一致・不存在はnull', async () => {
    expect(await getBlogContentDraftFromKV(kv, 'test_article', 'wrong')).toBeNull()
    expect(await getBlogContentDraftFromKV(kv, 'no_such', 'blog-draft-key')).toBeNull()
  })

  it('secret_metaもドラフトから取得できる', async () => {
    const meta = await getBlogSecretMetaFromDraft(kv, 'test_article', 'blog-draft-key')
    expect(meta).toEqual({ is_secret: true, secret_code: 'draft-secret' })
    expect(await getBlogSecretMetaFromDraft(kv, 'test_article', 'wrong')).toBeNull()
  })
})
