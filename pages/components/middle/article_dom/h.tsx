// CMSデータの h1, h2... は、ブログ内のコンテンツに合わせたときタイトルを h1 とする都合でそれぞれ一つずつ下の階層に置換する
export default function Hn({ tag, text }: { tag: string; text: string }) {
  if (tag === 'h1') {
    return (
      <div className="pt-6 pb-3 space-y-0">
        <h2 className="text-xl font-bold pl-2 pb-1 content-h2">{text}</h2>
      </div>
    )
  }
  if (tag === 'h2') {
    return (
      <div className="pt-6 pb-3 space-y-0">
        <h3 className="text-lg font-bold border-blue-900 pl-3 border-l-4">{text}</h3>
      </div>
    )
  }
  if (tag === 'h3') {
    return (
      <div className="flex flex-row items-center pt-4 space-x-2">
        <div className="w-2 h-2 rounded-full bg-blue-900 inline-block"></div>
        <h4 className="text-lg font-bold">{text}</h4>
      </div>
    )
  }
  if (tag === 'h4') {
    return (
      <div className="flex flex-row items-center pt-4 pb-4 space-x-2">
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
