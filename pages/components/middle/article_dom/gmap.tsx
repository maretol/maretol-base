import { outerContentIframeSandbox } from '@/lib/static'

// 一旦は通常のGoogle Mapの埋め込みで得られるiframeをそのまま利用する
// そのうちGCPのMaps APIを利用して、地点を入れるだけで表示できるようにしたい
export default function Gmaps({ subtexts }: { subtexts: { [key: string]: string } | undefined }) {
  if (!subtexts) {
    return (
      <div className="py-6">
        <p>地図情報がありません</p>
      </div>
    )
  }

  const { iframe } = subtexts
  if (iframe) {
    // iframe の src がGoogle Mapsか確認する
    const startPoint = iframe.indexOf('<iframe src="https://www.google.com/maps/embed?')
    if (startPoint !== 0) {
      return (
        <div className="py-6">
          <p>現在その地図情報の埋め込みには対応していません</p>
        </div>
      )
    }

    // iframeにsandbox属性を追加する
    const sandbox = outerContentIframeSandbox
    const sanitizedIframe = iframe.replace(/<iframe /, `<iframe sandbox="${sandbox}" `)

    // iframeをそのまま表示する
    // 注意: ここではdangerouslySetInnerHTMLを使用しているため、信頼できるコンテンツのみを使用してください
    return (
      <div className="py-6 w-full">
        <div
          className="max-w-xl w-full h-auto p-2 rounded-xs bg-indigo-200"
          dangerouslySetInnerHTML={{ __html: sanitizedIframe }}
        />
      </div>
    )
  }

  return (
    <div className="py-6">
      <p>現在その地図情報の埋め込みには対応していません</p>
    </div>
  )
}
