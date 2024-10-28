// CMSデータの h1, h2... は、ブログ内のコンテンツに合わせたときタイトルを h1 とする都合でそれぞれ一つずつ下の階層に置換する
export default function Hn({ tag, text }: { tag: string; text: string }) {
  if (tag === 'h1') {
    return (
      <div className="pt-6 space-y-0">
        <div className="ml-1 mb-1">
          <h2 className="text-xl font-bold">{text}</h2>
        </div>
        <hr className="h-[4px] bg-gradient-to-r from-blue-900 to-60% rounded-lg border-none" />
      </div>
    )
  }
  if (tag === 'h2') {
    return (
      <div className="pt-6 space-y-0">
        <div className="border-l-4 border-blue-900 pl-3">
          <h3 className="text-lg font-bold">{text}</h3>
        </div>
      </div>
    )
  }
  if (tag === 'h3') {
    return (
      <div className="flex flex-row items-center pt-3 space-x-2">
        <div className="w-2 h-2 rounded-full bg-blue-900 inline-block"></div>
        <h4 className="text-lg font-bold">{text}</h4>
      </div>
    )
  }
  if (tag === 'h4') {
    return (
      <div className="flex flex-row items-center pt-2 space-x-2">
        <div className="w-2 h-1 rounded-full bg-blue-900 inline-block"></div>
        <h5 className="font-bold ">{text}</h5>
      </div>
    )
  }
  if (tag === 'h5') {
    return <h6 className="pt-2">{text}</h6>
  }
  return <p>{text}</p>
}
