// CMSデータの h1, h2... は、ブログ内のコンテンツに合わせたときタイトルを h1 とする都合でそれぞれ一つずつ下の階層に置換する
export default function Hn({ tag, text, attrs }: { tag: string; text: string; attrs?: { [key: string]: string } }) {
  const id = attrs?.id ? attrs.id : undefined

  if (tag === 'h1') {
    return (
      <div className="mt-2 pt-6 pb-2 space-y-0 -ml-1">
        <h2 id={id} className="text-2xl font-bold pl-2 pb-1 content-h2">
          {text}
        </h2>
      </div>
    )
  }
  if (tag === 'h2') {
    return (
      <div className="mt-2 pt-6 pb-3 space-y-0 -ml-1">
        <h3 id={id} className="text-xl font-bold border-blue-900 pl-3 border-l-4">
          {text}
        </h3>
      </div>
    )
  }
  if (tag === 'h3') {
    return (
      <div className="flex flex-row items-center pt-4 pb-1 space-x-2">
        <div className="w-2 h-2 rounded-full bg-blue-900 inline-block"></div>
        <h4 id={id} className="text-lg font-bold">
          {text}
        </h4>
      </div>
    )
  }
  if (tag === 'h4') {
    return (
      <div className="flex flex-row items-center pt-4 pb-4 space-x-2">
        <div className="w-2 h-1 rounded-full bg-blue-900 inline-block"></div>
        <h5 id={id} className="font-bold">
          {text}
        </h5>
      </div>
    )
  }
  if (tag === 'h5') {
    return (
      <h6 id={id} className="pt-2">
        {text}
      </h6>
    )
  }
  return <p>{text}</p>
}
