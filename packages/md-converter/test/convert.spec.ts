import { describe, it, expect } from 'vitest'
import { convertMarkdownToHtml } from '../src/index'

describe('見出しの変換', () => {
  it('全見出しに決定的なidが付与される', () => {
    const html = convertMarkdownToHtml('# 見出し1')
    expect(html).toMatch(/^<h1 id="h[0-9a-f]{8}">見出し1<\/h1>\n$/)
  })

  it('同じ入力からは同じidが生成される（決定性）', () => {
    const a = convertMarkdownToHtml('## 見出し2')
    const b = convertMarkdownToHtml('## 見出し2')
    expect(a).toBe(b)
  })

  it('@@index_target 指定で span.index に包まれる', () => {
    const html = convertMarkdownToHtml('# 見出し1@@index_target')
    expect(html).toMatch(/^<h1 id="h[0-9a-f]{8}"><span class="index">見出し1<\/span><\/h1>\n$/)
  })

  it('@@index_target の有無で本文テキストのidは変わらない', () => {
    const withMarker = convertMarkdownToHtml('# タイトル@@index_target')
    const without = convertMarkdownToHtml('# タイトル')
    const idOf = (h: string) => h.match(/id="(h[0-9a-f]{8})"/)?.[1]
    expect(idOf(withMarker)).toBe(idOf(without))
  })

  it('同一テキストの見出しが重複してもidが衝突しない', () => {
    const html = convertMarkdownToHtml('# 同じ見出し\n\n# 同じ見出し')
    const ids = [...html.matchAll(/id="(h[0-9a-f]{8})"/g)].map((m) => m[1])
    expect(ids).toHaveLength(2)
    expect(ids[0]).not.toBe(ids[1])
  })

  it('h1からh5まで変換される', () => {
    const html = convertMarkdownToHtml('# h1\n\n## h2\n\n### h3\n\n#### h4\n\n##### h5')
    ;['h1', 'h2', 'h3', 'h4', 'h5'].forEach((tag) => {
      expect(html).toContain(`<${tag} id="`)
    })
  })
})

describe('コードフェンスの変換', () => {
  it('lang:filename 形式で data-filename 付き div に変換される', () => {
    const md = '```go:test.go\nfunc main(){\n    fmt.Println("Hello World")\n}\n```'
    const html = convertMarkdownToHtml(md)
    expect(html).toBe(
      '<div data-filename="test.go"><pre><code>func main(){\n    fmt.Println(&quot;Hello World&quot;)\n}\n</code></pre></div>\n'
    )
  })

  it('ファイル名なし（言語のみ）でも div で包まれる', () => {
    const html = convertMarkdownToHtml('```js\nconsole.log(1)\n```')
    expect(html).toBe('<div><pre><code>console.log(1)\n</code></pre></div>\n')
  })

  it('info文字列なしでも div で包まれる', () => {
    const html = convertMarkdownToHtml('```\nplain\n```')
    expect(html).toBe('<div><pre><code>plain\n</code></pre></div>\n')
  })

  it('コード内のHTMLはエスケープされる', () => {
    const html = convertMarkdownToHtml('```html:a.html\n<script>alert(1)</script>\n```')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
  })
})

describe('インラインHTMLの制御', () => {
  it('span.inline-markup（ルビ・注釈）は素通しされる', () => {
    const md = '<span class="inline-markup">吾輩@@ruby::わがはい</span>は猫である。'
    const html = convertMarkdownToHtml(md)
    expect(html).toBe('<p><span class="inline-markup">吾輩@@ruby::わがはい</span>は猫である。</p>\n')
  })

  it('装飾系タグ（u, s, sub, sup）は素通しされる', () => {
    const html = convertMarkdownToHtml('<u>下線</u>と<s>打ち消し</s>と<sub>下付き</sub>と<sup>上付き</sup>')
    expect(html).toBe('<p><u>下線</u>と<s>打ち消し</s>と<sub>下付き</sub>と<sup>上付き</sup></p>\n')
  })

  it('iframe等の許可外インラインHTMLはエスケープされてテキストとして保持される', () => {
    const md = '/gmaps@@iframe::<iframe src="https://www.google.com/maps/embed?pb=test" width="600"></iframe>'
    const html = convertMarkdownToHtml(md)
    // microCMSの出力と同様にエスケープテキストになる（parse()がtext()でパラメータ抽出できる形）
    expect(html).toBe(
      '<p>/gmaps@@iframe::&lt;iframe src=&quot;https://www.google.com/maps/embed?pb=test&quot; width=&quot;600&quot;&gt;&lt;/iframe&gt;</p>\n'
    )
  })
})

describe('inline-markup ショートカット記法', () => {
  it('[[親文字@@ruby::よみ]] が span.inline-markup に変換される', () => {
    const html = convertMarkdownToHtml('これは[[約束された勝利の剣@@ruby::エクスカリバー]]です')
    expect(html).toBe(
      '<p>これは<span class="inline-markup">約束された勝利の剣@@ruby::エクスカリバー</span>です</p>\n'
    )
  })

  it('1行に複数のショートカットを変換できる', () => {
    const html = convertMarkdownToHtml('[[漢字@@ruby::かんじ]]と[[単語@@ruby::たんご]]')
    expect(html).toBe(
      '<p><span class="inline-markup">漢字@@ruby::かんじ</span>と<span class="inline-markup">単語@@ruby::たんご</span></p>\n'
    )
  })

  it('注釈記法 [[@@annotation::...]] も変換される', () => {
    const html = convertMarkdownToHtml('本文[[@@annotation::注釈テキスト]]続き')
    expect(html).toBe('<p>本文<span class="inline-markup">@@annotation::注釈テキスト</span>続き</p>\n')
  })

  it('強調の内側でも変換される', () => {
    const html = convertMarkdownToHtml('**強調内[[漢字@@ruby::かんじ]]**')
    expect(html).toBe('<p><strong>強調内<span class="inline-markup">漢字@@ruby::かんじ</span></strong></p>\n')
  })

  it('@@ を含まない [[...]] はリテラルのまま残る', () => {
    const html = convertMarkdownToHtml('[[ただの二重括弧]]は変換しない')
    expect(html).toBe('<p>[[ただの二重括弧]]は変換しない</p>\n')
  })

  it('インラインコード・コードフェンス内は変換されない', () => {
    expect(convertMarkdownToHtml('`[[code@@ruby::よみ]]`')).toBe('<p><code>[[code@@ruby::よみ]]</code></p>\n')
    const fence = convertMarkdownToHtml('```\n[[code@@ruby::よみ]]\n```')
    expect(fence).not.toContain('inline-markup')
    expect(fence).toContain('[[code@@ruby::よみ]]')
  })

  it(']] の閉じ忘れはリテラルのまま残る', () => {
    const html = convertMarkdownToHtml('[[閉じない@@ruby::よみ')
    expect(html).toBe('<p>[[閉じない@@ruby::よみ</p>\n')
  })

  it('内部のHTML特殊文字はエスケープされる', () => {
    const html = convertMarkdownToHtml('[[a<b>@@ruby::x&y]]')
    expect(html).toBe('<p><span class="inline-markup">a&lt;b&gt;@@ruby::x&amp;y</span></p>\n')
  })
})

describe('URL・コマンド行の保持', () => {
  it('単行URLは自動リンクされずプレーンな p のまま', () => {
    const html = convertMarkdownToHtml('https://github.com/maretol/maretol-base')
    expect(html).toBe('<p>https://github.com/maretol/maretol-base</p>\n')
  })

  it('画像URL+サブテキストがそのまま保持される', () => {
    const md = 'https://r2.maretol.xyz/image.png@@title::タイトル@@caption::キャプション'
    const html = convertMarkdownToHtml(md)
    expect(html).toBe('<p>https://r2.maretol.xyz/image.png@@title::タイトル@@caption::キャプション</p>\n')
  })

  it('コマンド行がそのまま保持される', () => {
    expect(convertMarkdownToHtml('/table_of_contents')).toBe('<p>/table_of_contents</p>\n')
    expect(convertMarkdownToHtml('/br')).toBe('<p>/br</p>\n')
    expect(convertMarkdownToHtml('/nofetch_url@@url::https://example.com@@title::Example')).toBe(
      '<p>/nofetch_url@@url::https://example.com@@title::Example</p>\n'
    )
  })
})

describe('基本記法', () => {
  it('段落と改行（breaks: 単一改行はbr、空行で段落分割）', () => {
    const html = convertMarkdownToHtml('行1\n行2\n\n次の段落')
    expect(html).toBe('<p>行1<br>\n行2</p>\n<p>次の段落</p>\n')
  })

  it('装飾（強調・斜体・打ち消し・インラインコード）', () => {
    const html = convertMarkdownToHtml('**太字** *斜体* ~~打ち消し~~ `code`')
    expect(html).toBe('<p><strong>太字</strong> <em>斜体</em> <s>打ち消し</s> <code>code</code></p>\n')
  })

  it('テーブル（GFM）', () => {
    const md = '| a | b |\n| --- | --- |\n| 1 | 2 |'
    const html = convertMarkdownToHtml(md)
    expect(html).toContain('<table>')
    expect(html).toContain('<th>a</th>')
    expect(html).toContain('<td>1</td>')
  })

  it('リスト・ネストしたリスト', () => {
    const md = '- list1\n- list2\n  1. num1\n  2. num2'
    const html = convertMarkdownToHtml(md)
    expect(html).toContain('<ul>')
    expect(html).toContain('<ol>')
  })

  it('区切り線', () => {
    expect(convertMarkdownToHtml('---')).toBe('<hr>\n')
  })

  it('引用とcite記法（リンク解釈されず生テキストとして保持される）', () => {
    const md = '> 引用テスト\n> cite::[太宰治　走れメロス](https://example.com)'
    const html = convertMarkdownToHtml(md)
    expect(html).toContain('<blockquote>')
    // pages側がテキストから [タイトル](URL) を正規表現で解釈するため、リテラル保持が必須
    expect(html).toContain('cite::[太宰治　走れメロス](https://example.com)')
    expect(html).not.toContain('<a href')
  })

  it('cite::以外の行では通常のMarkdownリンク記法が使える', () => {
    const html = convertMarkdownToHtml('これは[リンク](https://example.com)です')
    expect(html).toBe('<p>これは<a href="https://example.com">リンク</a>です</p>\n')
  })

  it('cite::行にバックスラッシュが含まれてもリンク解釈の抑止をすり抜けない', () => {
    // 「\[」を含む入力: \ を先にエスケープしないと「\\[」となり [x](y) がリンク化してしまう
    const md = '> 引用\n> cite::\\[タイトル](https://example.com)'
    const html = convertMarkdownToHtml(md)
    expect(html).not.toContain('<a href')
    expect(html).toContain('cite::\\[タイトル](https://example.com)')
  })
})
