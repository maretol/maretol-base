import type { ParsedContent } from 'api-types'
import { describe, expect, test } from 'vitest'
import { buildRssFeed, formatRssDate, type FeedArticle } from './rss'

const host = 'https://example.com'

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

describe('buildRssFeed', () => {
  test('描画した時刻に依存せず、同じ記事からは同じ本文になる', () => {
    const first = buildRssFeed(host, articles, new Date('2026-10-24T10:00:00Z'))
    const second = buildRssFeed(host, articles, new Date('2026-12-31T23:59:59Z'))
    expect(second.body).toBe(first.body)
    expect(second.lastModified).toEqual(first.lastModified)
  })

  test('channel の pubDate は最新記事の公開時刻、lastBuildDate と Last-Modified は公開・更新のうち最新の時刻', () => {
    const now = new Date('2026-10-24T10:00:00Z')
    const { body, lastModified } = buildRssFeed(host, articles, now)
    const channel = channelOf(body)
    expect(channel).toContain('<pubDate>Fri, 23 Oct 2026 15:37:09 GMT</pubDate>')
    expect(channel).toContain('<lastBuildDate>Sat, 24 Oct 2026 01:00:00 GMT</lastBuildDate>')
    expect(channel).toContain('<copyright>© 2026 Maretol</copyright>')
    expect(channel).not.toContain(formatRssDate(now))
    expect(lastModified).toEqual(new Date('2026-10-24T01:00:00.000Z'))
  })

  test('item には記事 URL の guid と、公開時刻の pubDate が付く', () => {
    const { body } = buildRssFeed(host, articles, new Date())
    expect(body).toContain('<link>https://example.com/blog/newer</link>')
    expect(body).toContain('<guid isPermaLink="true">https://example.com/blog/newer</guid>')
    expect(body).toContain('<guid isPermaLink="true">https://example.com/blog/older</guid>')
    // item の pubDate は記事を直しても変わらない
    expect(body).toContain('<pubDate>Mon, 12 Oct 2026 11:32:54 GMT</pubDate>')
    expect(body).not.toContain('<pubDate>Sat, 24 Oct 2026 01:00:00 GMT</pubDate>')
    expect(body).toContain('<description><![CDATA[<p>本文 newer</p>]]></description>')
  })

  test('記事が 1 件も無いときは渡した時刻を使う', () => {
    const now = new Date('2026-10-24T10:00:00Z')
    const { body, lastModified } = buildRssFeed(host, [], now)
    expect(body).not.toContain('<item>')
    expect(body).toContain(`<lastBuildDate>${formatRssDate(now)}</lastBuildDate>`)
    expect(body).toContain(`<pubDate>${formatRssDate(now)}</pubDate>`)
    expect(lastModified).toEqual(now)
  })
})
