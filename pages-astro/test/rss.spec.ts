import type { ParsedContent } from 'api-types'
import { describe, expect, test } from 'vitest'
import {
  blogFeedItem,
  buildRssFeed,
  comicFeedItem,
  formatRssDate,
  illustFeedItem,
  type FeedArticle,
  type FeedChannel,
} from '@/lib/rss'

const host = 'https://example.com'
const channel: FeedChannel = { title: 'Maretol Base', link: host, description: 'maretolの個人サイトです' }

function paragraph(text: string): ParsedContent {
  return { index: 0, tag_name: 'p', class: '', attributes: {}, raw_text: text, text, inner_html: text }
}

function article(id: string, publishedAt: string, revisedAt = publishedAt): FeedArticle {
  return { id, title: `記事 ${id}`, publishedAt, revisedAt, parsed_content: [paragraph(`本文 ${id}`)] }
}

// channel の部分（最初の item より前）
function channelOf(body: string): string {
  return body.slice(0, body.indexOf('<item>'))
}

// 新しい記事と、公開は古いが後から直した記事
const articles = [
  article('newer', '2026-10-23T15:37:09.000Z'),
  article('older', '2026-10-12T11:32:54.000Z', '2026-10-24T01:00:00.000Z'),
]
const items = articles.map((a) => blogFeedItem(host, a))

describe('buildRssFeed', () => {
  test('描画した時刻に依存せず、同じ内容からは同じ本文になる', () => {
    const first = buildRssFeed(channel, items, new Date('2026-10-24T10:00:00Z'))
    const second = buildRssFeed(channel, items, new Date('2026-12-31T23:59:59Z'))
    expect(second.body).toBe(first.body)
    expect(second.lastModified).toEqual(first.lastModified)
  })

  test('channel には題名・一覧の URL・説明が入る', () => {
    const { body } = buildRssFeed(
      { title: 'Comics | Maretol Base', link: `${host}/comics`, description: 'maretolの漫画の一覧です' },
      items,
      new Date(),
    )
    const channelPart = channelOf(body)
    expect(channelPart).toContain('<title>Comics | Maretol Base</title>')
    expect(channelPart).toContain('<link>https://example.com/comics</link>')
    expect(channelPart).toContain('<description>maretolの漫画の一覧です</description>')
  })

  test('channel の pubDate は最新の公開時刻、lastBuildDate と Last-Modified は公開・更新のうち最新の時刻', () => {
    const now = new Date('2026-10-24T10:00:00Z')
    const { body, lastModified } = buildRssFeed(channel, items, now)
    const channelPart = channelOf(body)
    expect(channelPart).toContain('<pubDate>Fri, 23 Oct 2026 15:37:09 GMT</pubDate>')
    expect(channelPart).toContain('<lastBuildDate>Sat, 24 Oct 2026 01:00:00 GMT</lastBuildDate>')
    expect(channelPart).toContain('<copyright>© 2026 Maretol</copyright>')
    expect(channelPart).not.toContain(formatRssDate(now))
    expect(lastModified).toEqual(new Date('2026-10-24T01:00:00.000Z'))
  })

  test('item にはページ URL の guid と、公開時刻の pubDate が付く', () => {
    const { body } = buildRssFeed(channel, items, new Date())
    expect(body).toContain('<link>https://example.com/blog/newer</link>')
    expect(body).toContain('<guid isPermaLink="true">https://example.com/blog/newer</guid>')
    expect(body).toContain('<guid isPermaLink="true">https://example.com/blog/older</guid>')
    // item の pubDate は内容を直しても変わらない
    expect(body).toContain('<pubDate>Mon, 12 Oct 2026 11:32:54 GMT</pubDate>')
    expect(body).not.toContain('<pubDate>Sat, 24 Oct 2026 01:00:00 GMT</pubDate>')
    expect(body).toContain('<description><![CDATA[<p>本文 newer</p>]]></description>')
  })

  test('1 件も無いときは渡した時刻を使う', () => {
    const now = new Date('2026-10-24T10:00:00Z')
    const { body, lastModified } = buildRssFeed(channel, [], now)
    expect(body).not.toContain('<item>')
    expect(body).toContain(`<lastBuildDate>${formatRssDate(now)}</lastBuildDate>`)
    expect(body).toContain(`<pubDate>${formatRssDate(now)}</pubDate>`)
    expect(lastModified).toEqual(now)
  })
})

describe('comicFeedItem', () => {
  // 表紙（cover）があっても使わない
  const comic = {
    id: 'comic1',
    title_name: '漫画 1',
    publishedAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-02T00:00:00.000Z',
    contents_url: 'https://r2.example.com/comics/comic1/index.json',
    cover: 'cover.png',
    filename: 'comic1',
    first_page: 1,
    format: ['png'],
  }

  test('リンクは漫画の詳細。先頭ページ（表紙ではない）の派生画像とページへのリンクだけを載せ、更新時刻は updatedAt', () => {
    const item = comicFeedItem(host, comic)
    expect(item.title).toBe('漫画 1')
    expect(item.link).toBe('https://example.com/comics/comic1')
    expect(item.description).toBe(
      '<figure><img src="https://www.maretol.xyz/cdn-cgi/image/w=640,q=80,f=auto/https://r2.example.com/comics/comic1/comic1_001.png" alt="漫画 1"></figure>\n' +
        '<p><a href="https://example.com/comics/comic1">続きを読む</a></p>',
    )
    expect(item.description).not.toContain('cover.png')
    expect(item.publishedAt).toBe('2026-10-01T00:00:00.000Z')
    expect(item.revisedAt).toBe('2026-10-02T00:00:00.000Z')
  })
})

describe('illustFeedItem', () => {
  test('リンクはイラストの詳細。画像の派生とページへのリンクだけを載せる', () => {
    const item = illustFeedItem(host, {
      id: 'illust1',
      title: 'イラスト 1',
      src: 'https://r2.example.com/illust/illust1.png',
      publishedAt: '2026-10-05T00:00:00.000Z',
      revisedAt: '2026-10-06T00:00:00.000Z',
    })
    expect(item.title).toBe('イラスト 1')
    expect(item.link).toBe('https://example.com/illust/detail/illust1')
    expect(item.description).toBe(
      '<figure><img src="https://www.maretol.xyz/cdn-cgi/image/w=640,q=80,f=auto/https://r2.example.com/illust/illust1.png" alt="イラスト 1"></figure>\n' +
        '<p><a href="https://example.com/illust/detail/illust1">サイトで見る</a></p>',
    )
    expect(item.publishedAt).toBe('2026-10-05T00:00:00.000Z')
    expect(item.revisedAt).toBe('2026-10-06T00:00:00.000Z')
  })
})
