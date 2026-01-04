export default function Blockquote({
  innerHTML,
  text,
}: {
  innerHTML: string
  text: string
  attrs?: { [name: string]: string }
}) {
  // text の cite:: 以降を引用元として解釈し、cite属性にセットする
  let citeText = ''
  let citeURL = null
  if (text.includes('cite::')) {
    const lastLine = text.split('cite::').pop()
    if (lastLine) {
      // lastLine は [引用元のテキスト](URL) という形式、または [引用元のテキスト] という形式
      const urlMatch = lastLine.match(/\(([^)]+)\)/)
      if (urlMatch) {
        // 引用元テキストが [] で囲まれている場合それを優先。囲われてない場合はURL要素を除去して表示
        const titleMatch = lastLine.match(/\[(.+)\]/)
        citeText = titleMatch ? titleMatch[1] : lastLine.replace(urlMatch[0], '')
        citeURL = urlMatch[1]
      } else {
        citeText = lastLine
        // citeText が URL だけの場合はリンクのためURL要素もセット
        if (lastLine.match(/https?:\/\/.+/)) {
          citeURL = lastLine
        }
      }
      innerHTML = innerHTML.replace(`cite::${lastLine}`, '')
    }
  }

  return (
    <div className="py-3">
      <blockquote cite={citeText} className="bg-gray-200 text-gray-700 p-6 rounded-lg border-l-8 border-l-gray-500">
        <div dangerouslySetInnerHTML={{ __html: innerHTML }} />
        <div className={'w-full text-right'}>
          <cite className="text-sm text-gray-500 text-left">
            {citeURL ? <a href={citeURL}>{citeText}</a> : <>{citeText}</>}
          </cite>
        </div>
      </blockquote>
    </div>
  )
}
