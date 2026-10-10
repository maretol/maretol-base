// 引用元表記は引用の最終行に cite:: で記述する仕様。最後の cite:: 以降を引用元として解釈し、本文からは取り除く
// Markdown 変換後の HTML では行末に改行が残るため、trim して解釈・除去する
export function parseBlockquoteCite(
  innerHTML: string,
  text: string,
): { innerHTML: string; citeText: string; citeURL: string | null } {
  const lastLine = text.includes('cite::') ? text.split('cite::').pop()?.trim() : undefined
  if (!lastLine) {
    return { innerHTML, citeText: '', citeURL: null }
  }

  // 直前の <br> ごと除去し、引用末尾に空行が残らないようにする（<br> がない旧 HTML 構造では後者のみマッチ）
  const body = innerHTML.replace(`<br>\ncite::${lastLine}`, '').replace(`cite::${lastLine}`, '')

  // lastLine は [引用元のテキスト](URL) という形式、または [引用元のテキスト] という形式
  const urlMatch = lastLine.match(/\(([^)]+)\)/)
  if (urlMatch) {
    // 引用元テキストが [] で囲まれている場合それを優先。囲われてない場合は URL 要素を除去して表示
    const titleMatch = lastLine.match(/\[(.+)\]/)
    return {
      innerHTML: body,
      citeText: titleMatch ? titleMatch[1] : lastLine.replace(urlMatch[0], ''),
      citeURL: urlMatch[1],
    }
  }
  // citeText が URL だけの場合はリンクのため URL 要素もセット
  return { innerHTML: body, citeText: lastLine, citeURL: /https?:\/\/.+/.test(lastLine) ? lastLine : null }
}
