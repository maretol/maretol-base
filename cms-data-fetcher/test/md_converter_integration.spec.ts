/**
 * md-converter との統合テスト
 * 「Markdown → 互換HTML → parse()」の結果が、microCMS由来のHTMLを parse() した結果と
 * 同等の ParsedContent 構造になることを検証する（cms_milestones.md M2 のテスト要件）
 */
import { describe, it, expect } from 'vitest'
import { convertMarkdownToHtml } from 'md-converter'
import { parse } from '../src/parse'

describe('Markdown由来コンテンツのParsedContent互換性', () => {
  it('見出し: 目次(table_of_contents)がHTML由来と同等に生成される', () => {
    // microCMS由来のHTML（tmp/blog_contents.json のtest記事と同構造）
    const html =
      '<h1 id="ha879678dfe"><span class="index">見出し1</span></h1>' +
      '<h2 id="had7ce3f1cb">見出し2</h2>' +
      '<h2 id="hb6f212efab"><span class="index">通常テキスト</span></h2>'
    const md = '# 見出し1@@index_target\n\n## 見出し2\n\n## 通常テキスト@@index_target'

    const fromHtml = parse(html)
    const fromMd = parse(convertMarkdownToHtml(md))

    // 目次: span.index を持つ見出しのみが同じタイトル・レベルで並ぶ（idは生成方式が異なる）
    expect(fromMd.table_of_contents.map((t) => ({ title: t.title, level: t.level }))).toEqual(
      fromHtml.table_of_contents.map((t) => ({ title: t.title, level: t.level }))
    )
    // 全見出しにidがある
    fromMd.contents_array.forEach((c) => {
      expect(c.attributes['id']).toMatch(/^h[0-9a-f]{8}/)
    })
    // タグ構造が同じ
    expect(fromMd.contents_array.map((c) => c.tag_name)).toEqual(fromHtml.contents_array.map((c) => c.tag_name))
  })

  it('ルビ: inline-markupのspanがHTML由来と同一のrubyタグに変換される', () => {
    const html = '<p><span class="inline-markup">吾輩@@ruby::わがはい</span>は猫である。</p>'
    const md = '<span class="inline-markup">吾輩@@ruby::わがはい</span>は猫である。'

    const fromHtml = parse(html)
    const fromMd = parse(convertMarkdownToHtml(md))

    expect(fromMd.contents_array[0].inner_html).toBe(fromHtml.contents_array[0].inner_html)
    expect(fromMd.contents_array[0].inner_html).toContain('<ruby>吾輩<rp>(</rp><rt>わがはい</rt><rp>)</rp></ruby>')
  })

  it('注釈: annotationsがHTML由来と同等に採番・収集される', () => {
    const html =
      '<p>注釈テスト<span class="inline-markup">@@annotation::注釈テキスト</span></p>' +
      '<p><span class="inline-markup">本文@@annotation::二つ目</span></p>'
    const md = '注釈テスト<span class="inline-markup">@@annotation::注釈テキスト</span>\n\n<span class="inline-markup">本文@@annotation::二つ目</span>'

    const fromHtml = parse(html)
    const fromMd = parse(convertMarkdownToHtml(md))

    expect(fromMd.annotations).toEqual(fromHtml.annotations)
    expect(fromMd.annotations).toEqual([
      { number: 1, text: '注釈テキスト' },
      { number: 2, text: '二つ目' },
    ])
  })

  it('画像URL行: p_optionとsub_textsがHTML由来と一致する', () => {
    const line = 'https://r2.maretol.xyz/circle_cut/maretol_circle_cut.png@@title::サクカ@@caption::キャプション'
    const html = `<p>${line}</p>`

    const fromHtml = parse(html)
    const fromMd = parse(convertMarkdownToHtml(line))

    const pick = (c: (typeof fromHtml.contents_array)[0]) => ({
      tag: c.tag_name,
      p_option: c.p_option,
      text: c.text,
      sub_texts: c.sub_texts,
    })
    expect(pick(fromMd.contents_array[0])).toEqual(pick(fromHtml.contents_array[0]))
    expect(fromMd.contents_array[0].p_option).toBe('image')
    expect(fromMd.contents_array[0].sub_texts).toEqual({ title: 'サクカ', caption: 'キャプション' })
  })

  it('リンクカード用URL行: p_optionがHTML由来と一致する', () => {
    const cases: [string, string][] = [
      ['https://www.maretol.xyz/blog/test_article', 'blog'],
      ['https://www.maretol.xyz/comics/test_comic', 'comic'],
      ['https://www.maretol.xyz/illust/detail/test', 'illust_detail'],
      ['https://www.youtube.com/watch?v=test', 'youtube'],
      ['https://x.com/maretol/status/123', 'twitter'],
      ['https://github.com/maretol/maretol-base', 'url'],
    ]
    cases.forEach(([url, expected]) => {
      const fromHtml = parse(`<p>${url}</p>`)
      const fromMd = parse(convertMarkdownToHtml(url))
      expect(fromMd.contents_array[0].p_option).toBe(expected)
      expect(fromMd.contents_array[0].p_option).toBe(fromHtml.contents_array[0].p_option)
    })
  })

  it('gmapsコマンド: iframeパラメータがテキストとして完全に保持される', () => {
    const iframe =
      '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>'
    // microCMS ではエディタ入力時にエスケープされてHTMLになっていた
    const escaped = iframe.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const html = `<p>/gmaps@@iframe::${escaped}</p>`
    const md = `/gmaps@@iframe::${iframe}`

    const fromHtml = parse(html)
    const fromMd = parse(convertMarkdownToHtml(md))

    expect(fromMd.contents_array[0].p_option).toBe('gmaps')
    expect(fromMd.contents_array[0].p_option).toBe(fromHtml.contents_array[0].p_option)
    // 肝: iframeタグ文字列がsub_textsにそのまま入ること
    expect(fromMd.contents_array[0].sub_texts).toEqual(fromHtml.contents_array[0].sub_texts)
    expect(fromMd.contents_array[0].sub_texts?.['iframe']).toBe(iframe)
  })

  it('cite_imageコマンド: 全パラメータが保持される', () => {
    const line =
      '/cite_image@@url::https://example.com/image.png@@source::https://example.com/page@@caption::キャプション@@source_title::サイト名'
    const fromHtml = parse(`<p>${line}</p>`)
    const fromMd = parse(convertMarkdownToHtml(line))

    expect(fromMd.contents_array[0].p_option).toBe('cite_image')
    expect(fromMd.contents_array[0].sub_texts).toEqual(fromHtml.contents_array[0].sub_texts)
  })

  it('コードブロック: div[data-filename]のParsedContentがHTML由来と同等になる', () => {
    const html = '<div data-filename="test.go"><pre><code>func main(){\n    fmt.Println(&quot;Hello World&quot;)\n}\n</code></pre></div>'
    const md = '```go:test.go\nfunc main(){\n    fmt.Println("Hello World")\n}\n```'

    const fromHtml = parse(html)
    const fromMd = parse(convertMarkdownToHtml(md))

    expect(fromMd.contents_array[0].tag_name).toBe('div')
    expect(fromMd.contents_array[0].attributes['data-filename']).toBe('test.go')
    expect(fromMd.contents_array[0].inner_html).toBe(fromHtml.contents_array[0].inner_html)
  })

  it('blockquote: cite::記法がテキストとして保持される', () => {
    const html =
      '<blockquote><p>引用テスト</p><p>cite::[太宰治　走れメロス](https://example.com)</p></blockquote>'
    const md = '> 引用テスト\n>\n> cite::[太宰治　走れメロス](https://example.com)'

    const fromHtml = parse(html)
    const fromMd = parse(convertMarkdownToHtml(md))

    expect(fromMd.contents_array[0].tag_name).toBe('blockquote')
    // pages の blockquote コンポーネントは text から cite:: を解釈するため、text の一致が必須
    expect(fromMd.contents_array[0].text).toContain('cite::[太宰治　走れメロス](https://example.com)')
    expect(fromHtml.contents_array[0].text).toContain('cite::[太宰治　走れメロス](https://example.com)')
  })

  it('総合: 記事相当のMarkdownがトップレベル要素として正しく分解される', () => {
    const md = [
      '/table_of_contents',
      '',
      '# 導入@@index_target',
      '',
      '本文の段落です。**強調**もあります。',
      '',
      '行1\n行2',
      '',
      'https://photos.maretol.xyz/2026-06/sendai.jpg@@caption::写真',
      '',
      '---',
      '',
      '## まとめ@@index_target',
      '',
      '- item1',
      '- item2',
    ].join('\n')

    const result = parse(convertMarkdownToHtml(md))
    const tags = result.contents_array.map((c) => c.tag_name)
    expect(tags).toEqual(['p', 'h1', 'p', 'p', 'p', 'hr', 'h2', 'ul'])

    expect(result.contents_array[0].p_option).toBe('table_of_contents')
    expect(result.contents_array[4].p_option).toBe('photo')
    expect(result.table_of_contents).toHaveLength(2)
    expect(result.table_of_contents.map((t) => t.title)).toEqual(['導入', 'まとめ'])
  })
})
