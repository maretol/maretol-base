/**
 * D1レコード → blog API結果型マッピングと blog ドラフト参照のテスト
 */
import { describe, it, expect } from 'vitest'
import type { blogContentRow, blogCategoryRow, blogContentDraftRecord } from 'api-types'
import { toContentsAPIResult, toCategoryAPIResult, getBlogContentDraftFromKV, getBlogSecretMetaFromDraft } from '../src/d1_blog'
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
