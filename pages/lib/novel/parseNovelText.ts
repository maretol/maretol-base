// 小説本文（外部プレーンテキスト）を XSS 安全な HTML 文字列へ変換する純関数。
//
// 設計（design.md / Requirement 4）:
// - まず入力全文をエスケープし、その後に許可記法のみをタグへ置換する（エスケープ→置換順で XSS を防止）。
// - 対応記法（MVP・ネスト非対応）:
//     ルビ : [[rb:漢字 > かんじ]] -> <ruby>漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby>
//     太字 : [b:太字]            -> <strong>太字</strong>
//     斜体 : [i:斜体]            -> <em>斜体</em>
// - 改行整形: 1 行を 1 つの <p lang="ja"> 要素として扱い、空行は <br> 要素として出力する（連続空行は連続 <br>）。
// - 未対応・不正な記法はプレーンテキスト（エスケープ済み）として保持し、本文を壊さない。
// - 出力に含まれるタグは ruby/rp/rt/strong/em/p/br のみ。

// HTML エスケープ。& を最初に処理する点に注意（多重エスケープ防止）。
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// エスケープ済みの 1 行に対して許可記法をタグへ置換する。
// エスケープ済みのため、'>' は '&gt;' になっている点に合わせてルビの区切りを判定する。
function applyInlineMarkup(escaped: string): string {
  // ルビ: [[rb:基底 > 読み]]（区切りの '>' はエスケープ済みで '&gt;'）
  let html = escaped.replace(
    /\[\[rb:([^\]]*?)\s*&gt;\s*([^\]]*?)\]\]/g,
    (_match, base: string, reading: string) =>
      `<ruby>${base.trim()}<rp>(</rp><rt>${reading.trim()}</rt><rp>)</rp></ruby>`,
  )
  // 太字: [b:...]
  html = html.replace(/\[b:([^\]]*?)\]/g, '<strong>$1</strong>')
  // 斜体: [i:...]
  html = html.replace(/\[i:([^\]]*?)\]/g, '<em>$1</em>')
  return html
}

export function parseNovelText(raw: string): string {
  if (!raw) {
    return ''
  }

  // 改行コードを LF に正規化してから行単位に分割する
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  const htmlParts = lines.map((line) => {
    // 空行（空白のみの行を含む）は行間表現として <br> を出力する
    if (line.trim() === '') {
      return '<br>'
    }
    const escaped = escapeHtml(line)
    const inline = applyInlineMarkup(escaped)
    return `<p lang="ja">${inline}</p>`
  })

  return htmlParts.join('')
}
