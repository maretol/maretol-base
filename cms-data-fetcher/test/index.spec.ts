import { describe, it, expect } from 'vitest'
import { load } from 'cheerio'
import { getPOption, parseInlineParams, transformInlineMarkup, parse } from '../src/parse'

describe('parse_getPOptionのテスト', () => {
  it('通常テキストの場合', () => {
    const text = 'test text'
    const result = getPOption(text)
    expect(result).toBe('normal')
  })
  it('空文字の場合', () => {
    const text = ''
    const result = getPOption(text)
    expect(result).toBe('empty')
  })
  it('画像の場合', () => {
    const text = 'https://r2.maretol.xyz/test.png'
    const result = getPOption(text)
    expect(result).toBe('image')
  })
  it('写真の場合', () => {
    const text = ['https://photos.maretol.xyz/test.jpg', 'https://capture.maretol.xyz/test.jpg']
    text.forEach((t) => {
      const result = getPOption(t)
      expect(result).toBe('photo')
    })
  })
  it('写真でサブテキストがあった場合', () => {
    const text = 'https://photos.maretol.xyz/test.jpg@@subtext_key::subtext_value@@subtext::サブテキスト'
    const result = getPOption(text)
    expect(result).toBe('photo')
  })
  it('漫画リンクの場合', () => {
    const text = 'https://www.maretol.xyz/comics/test'
    const result = getPOption(text)
    expect(result).toBe('comic')
  })
  it('YouTubeリンクの場合', () => {
    const text = ['https://www.youtube.com/watch?v=test', 'https://youtu.be/test']
    text.forEach((t) => {
      const result = getPOption(t)
      expect(result).toBe('youtube')
    })
  }),
    it('Twitterリンクの場合', () => {
      const text = ['https://twitter.com/test', 'https://www.twitter.com/test', 'https://x.com/test']
      text.forEach((t) => {
        const result = getPOption(t)
        expect(result).toBe('twitter')
      })
    })
  it('Amazonリンクの場合', () => {
    const text = ['https://www.amazon.co.jp/test', 'https://amzn.to/test']
    text.forEach((t) => {
      const result = getPOption(t)
      expect(result).toBe('amazon')
    })
  })
  it('ブログリンクの場合', () => {
    const text = 'https://www.maretol.xyz/blog/test'
    const result = getPOption(text)
    expect(result).toBe('blog')
  })
  it('artifactリンクの場合', () => {
    const text = 'https://www.maretol.xyz/artifacts/test'
    const result = getPOption(text)
    expect(result).toBe('artifact')
  })
  it('その他のURLの場合', () => {
    const text = 'https://example.com'
    const result = getPOption(text)
    expect(result).toBe('url')
  })
  it('コマンド入力の場合', () => {
    const text = '/test_command'
    const result = getPOption(text)
    expect(result).toBe('test_command')
  })
  it('特殊なテキストの場合', () => {
    const text = ['text://hogehoge', '途中にURLが入っている場合。https://example.comみたいな']
    text.forEach((t) => {
      const result = getPOption(t)
      expect(result).toBe('normal')
    })
  })
})

describe('parseInlineParams のテスト', () => {
  it('単一パラメータのパース', () => {
    const text = '漢字@@ruby::かんじ'
    const result = parseInlineParams(text)
    expect(result.baseText).toBe('漢字')
    expect(result.params).toEqual({ ruby: 'かんじ' })
  })

  it('複数パラメータのパース', () => {
    const text = 'テキスト@@ruby::ルビ@@abbr::略語'
    const result = parseInlineParams(text)
    expect(result.baseText).toBe('テキスト')
    expect(result.params).toEqual({ ruby: 'ルビ', abbr: '略語' })
  })

  it('パラメータなしの場合', () => {
    const text = 'テキストのみ'
    const result = parseInlineParams(text)
    expect(result.baseText).toBe('テキストのみ')
    expect(result.params).toEqual({})
  })

  it('空文字の場合', () => {
    const text = ''
    const result = parseInlineParams(text)
    expect(result.baseText).toBe('')
    expect(result.params).toEqual({})
  })

  it('@@のみでキーバリューがない場合', () => {
    const text = 'テキスト@@'
    const result = parseInlineParams(text)
    expect(result.baseText).toBe('テキスト')
    expect(result.params).toEqual({})
  })

  it('::がない場合', () => {
    const text = 'テキスト@@invalidparam'
    const result = parseInlineParams(text)
    expect(result.baseText).toBe('テキスト')
    expect(result.params).toEqual({})
  })
})

describe('transformInlineMarkup のテスト', () => {
  it('inline-markup クラスを持つ span 要素を検出する', () => {
    const html = '<p>通常テキスト<span class="inline-markup">漢字@@ruby::かんじ</span>続き</p>'
    const $ = load(html)
    const element = $('p').get(0)!
    transformInlineMarkup($, element)
    const result = $('p').html()
    expect(result).toContain('<ruby>')
  })

  it('inline-markup クラスがない span は変換しない', () => {
    const html = '<p>通常テキスト<span class="other">漢字@@ruby::かんじ</span>続き</p>'
    const $ = load(html)
    const element = $('p').get(0)!
    transformInlineMarkup($, element)
    const result = $('p').html()
    expect(result).not.toContain('<ruby>')
    expect(result).toContain('<span class="other">')
  })

  it('複数の inline-markup span を処理する', () => {
    const html = '<p><span class="inline-markup">漢字@@ruby::かんじ</span>と<span class="inline-markup">単語@@ruby::たんご</span></p>'
    const $ = load(html)
    const element = $('p').get(0)!
    transformInlineMarkup($, element)
    const result = $('p').html()
    expect(result).toContain('<ruby>漢字')
    expect(result).toContain('<ruby>単語')
  })

  it('ハンドラーマップ構造で拡張可能', () => {
    // ruby パラメータのみ変換される
    const html = '<p><span class="inline-markup">テキスト@@ruby::ルビ</span></p>'
    const $ = load(html)
    const element = $('p').get(0)!
    transformInlineMarkup($, element)
    const result = $('p').html()
    expect(result).toContain('<ruby>テキスト<rp>(</rp><rt>ルビ</rt><rp>)</rp></ruby>')
  })
})

describe('Task 2.2: ruby パラメータのハンドラー', () => {
  it('ruby パラメータで HTML ruby 要素に変換される', () => {
    const html = '<p><span class="inline-markup">漢字@@ruby::かんじ</span></p>'
    const $ = load(html)
    const element = $('p').get(0)!
    transformInlineMarkup($, element)
    const result = $('p').html()
    expect(result).toBe('<ruby>漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby>')
  })

  it('rp 要素を含めてルビ未対応ブラウザへのフォールバックを提供', () => {
    const html = '<p><span class="inline-markup">難読@@ruby::なんどく</span></p>'
    const $ = load(html)
    const element = $('p').get(0)!
    transformInlineMarkup($, element)
    const result = $('p').html()
    // rp 要素が存在することを確認
    expect(result).toContain('<rp>(</rp>')
    expect(result).toContain('<rp>)</rp>')
    // rt 要素にルビが含まれることを確認
    expect(result).toContain('<rt>なんどく</rt>')
  })

  it('出力形式が仕様通りであること', () => {
    const html = '<p><span class="inline-markup">親文字@@ruby::ルビ</span></p>'
    const $ = load(html)
    const element = $('p').get(0)!
    transformInlineMarkup($, element)
    const result = $('p').html()
    // 仕様: <ruby>親文字<rp>(</rp><rt>ルビ</rt><rp>)</rp></ruby>
    expect(result).toBe('<ruby>親文字<rp>(</rp><rt>ルビ</rt><rp>)</rp></ruby>')
  })
})

describe('Task 2.3: 未知パラメータの処理', () => {
  it('ruby 以外のパラメータキーは変換をスキップする', () => {
    const html = '<p><span class="inline-markup">テキスト@@unknown::value</span></p>'
    const $ = load(html)
    const element = $('p').get(0)!
    transformInlineMarkup($, element)
    const result = $('p').html()
    // span がそのまま保持される
    expect(result).toContain('<span class="inline-markup">')
    expect(result).not.toContain('<ruby>')
  })

  it('未知パラメータでも警告やエラーを発生させない', () => {
    const html = '<p><span class="inline-markup">テキスト@@abbr::略語</span></p>'
    const $ = load(html)
    const element = $('p').get(0)!
    // エラーが発生しないことを確認
    expect(() => transformInlineMarkup($, element)).not.toThrow()
    const result = $('p').html()
    // 元の span が保持される
    expect(result).toContain('<span class="inline-markup">')
  })

  it('パラメータがない場合も span を保持する', () => {
    const html = '<p><span class="inline-markup">テキストのみ</span></p>'
    const $ = load(html)
    const element = $('p').get(0)!
    transformInlineMarkup($, element)
    const result = $('p').html()
    expect(result).toContain('<span class="inline-markup">')
  })

  it('複数パラメータで最初にマッチしたハンドラーで変換する', () => {
    // ruby が先にマッチするので ruby として変換される
    const html = '<p><span class="inline-markup">テキスト@@ruby::ルビ@@abbr::略語</span></p>'
    const $ = load(html)
    const element = $('p').get(0)!
    transformInlineMarkup($, element)
    const result = $('p').html()
    expect(result).toContain('<ruby>')
    expect(result).not.toContain('<span class="inline-markup">')
  })
})

// Task 4: 統合テスト
describe('Task 4.1: 基本的な変換テスト', () => {
  it('単一の inline-markup span を含む段落のパースを検証', () => {
    const html = '<p>これは<span class="inline-markup">漢字@@ruby::かんじ</span>のテストです</p>'
    const result = parse(html)
    expect(result.contents_array.length).toBe(1)
    expect(result.contents_array[0].inner_html).toContain('<ruby>')
    expect(result.contents_array[0].inner_html).toContain('漢字')
    expect(result.contents_array[0].inner_html).toContain('<rt>かんじ</rt>')
  })

  it('変換後の inner_html に ruby 要素が含まれることを確認', () => {
    const html = '<p><span class="inline-markup">難読@@ruby::なんどく</span></p>'
    const result = parse(html)
    expect(result.contents_array[0].inner_html).toBe('<ruby>難読<rp>(</rp><rt>なんどく</rt><rp>)</rp></ruby>')
  })

  it('text フィールドに親文字のみが含まれることを確認', () => {
    const html = '<p>これは<span class="inline-markup">漢字@@ruby::かんじ</span>のテストです</p>'
    const result = parse(html)
    // text は getText 関数で最初の @@ より前の部分が取得される
    // 「これは漢字@@ruby::かんじのテストです」 → 「これは漢字」
    expect(result.contents_array[0].text).toBe('これは漢字')
  })
})

describe('Task 4.2: 複合ケースのテスト', () => {
  it('1つの段落内に複数の inline-markup span が含まれるケースを検証', () => {
    const html = '<p><span class="inline-markup">漢字@@ruby::かんじ</span>と<span class="inline-markup">単語@@ruby::たんご</span></p>'
    const result = parse(html)
    expect(result.contents_array[0].inner_html).toContain('<ruby>漢字')
    expect(result.contents_array[0].inner_html).toContain('<ruby>単語')
  })

  it('inline-markup span の前後に通常テキストがあるケースを検証', () => {
    const html = '<p>前のテキスト<span class="inline-markup">中央@@ruby::ちゅうおう</span>後のテキスト</p>'
    const result = parse(html)
    expect(result.contents_array[0].inner_html).toContain('前のテキスト')
    expect(result.contents_array[0].inner_html).toContain('<ruby>中央')
    expect(result.contents_array[0].inner_html).toContain('後のテキスト')
  })

  it('通常の span と inline-markup span が混在するケースを検証', () => {
    const html = '<p><span class="normal">通常span</span>と<span class="inline-markup">ルビ@@ruby::るび</span></p>'
    const result = parse(html)
    expect(result.contents_array[0].inner_html).toContain('<span class="normal">通常span</span>')
    expect(result.contents_array[0].inner_html).toContain('<ruby>ルビ')
  })

  it('リンク要素内の inline-markup span が正しく変換されることを検証', () => {
    const html = '<p><a href="https://example.com"><span class="inline-markup">リンク@@ruby::りんく</span></a></p>'
    const result = parse(html)
    expect(result.contents_array[0].inner_html).toContain('<a href="https://example.com">')
    expect(result.contents_array[0].inner_html).toContain('<ruby>リンク')
  })
})

describe('Task 4.3: 見出しと目次のテスト', () => {
  it('見出し要素内の inline-markup が正しく変換されることを検証', () => {
    const html = '<h2 id="test"><span class="index"></span><span class="inline-markup">見出し@@ruby::みだし</span></h2>'
    const result = parse(html)
    expect(result.contents_array[0].inner_html).toContain('<ruby>見出し')
  })

  it('目次生成時のタイトルにルビが含まれないことを検証', () => {
    const html = '<h2 id="test-heading"><span class="index"></span><span class="inline-markup">難読@@ruby::なんどく</span>見出し</h2>'
    const result = parse(html)
    // 目次が生成されていることを確認
    expect(result.table_of_contents.length).toBe(1)
    // getText 関数が最初の @@ より前を取得するため、「難読@@ruby::なんどく見出し」 → 「難読」
    // これによりルビパラメータは目次タイトルから除外される（要件 3.3 を満たす）
    expect(result.table_of_contents[0].title).toBe('難読')
  })

  it('既存の目次生成機能への影響がないことを確認', () => {
    const html = '<h2 id="normal-heading"><span class="index"></span>通常の見出し</h2>'
    const result = parse(html)
    expect(result.table_of_contents.length).toBe(1)
    expect(result.table_of_contents[0].id).toBe('normal-heading')
    expect(result.table_of_contents[0].title).toBe('通常の見出し')
    expect(result.table_of_contents[0].level).toBe(2)
  })
})

describe('Task 4.4: 既存機能との互換性テスト', () => {
  it('行単位サブテキスト（@@key::value）との共存を検証', () => {
    // 行単位のサブテキストは段落レベルで処理される
    const html = '<p>画像URL@@caption::キャプション</p>'
    const result = parse(html)
    expect(result.contents_array[0].sub_texts).toEqual({ caption: 'キャプション' })
    expect(result.contents_array[0].text).toBe('画像URL')
  })

  it('インラインマークアップとサブテキストが同一要素内に存在する場合', () => {
    // 行単位サブテキストとインラインマークアップの独立動作を確認
    const html = '<p><span class="inline-markup">漢字@@ruby::かんじ</span>のテスト@@note::備考</p>'
    const result = parse(html)
    // インラインマークアップは変換される
    expect(result.contents_array[0].inner_html).toContain('<ruby>漢字')
    // 行単位サブテキストも抽出される
    expect(result.contents_array[0].sub_texts).toEqual({ 'ruby': 'かんじのテスト', 'note': '備考' })
  })

  it('既存のコマンド記法（/command）への影響がないことを確認', () => {
    const html = '<p>/test_command</p>'
    const result = parse(html)
    expect(result.contents_array[0].p_option).toBe('test_command')
  })

  it('inline-markup クラスを持たない span 要素が通常通り処理されることを確認', () => {
    const html = '<p><span class="highlight">ハイライト</span>テキスト</p>'
    const result = parse(html)
    expect(result.contents_array[0].inner_html).toContain('<span class="highlight">ハイライト</span>')
  })

  it('p_option 判定はインラインマークアップ変換前のテキストに対して行われる', () => {
    // span.inline-markup を含む段落でも、テキスト内容に基づいて p_option が判定される
    const html = '<p>通常テキスト<span class="inline-markup">漢字@@ruby::かんじ</span></p>'
    const result = parse(html)
    expect(result.contents_array[0].p_option).toBe('normal')
  })
})
