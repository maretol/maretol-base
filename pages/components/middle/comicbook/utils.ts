import { PageState, SeriesGuide } from './types'

export function getPageImageSrc(baseUrl: string, filename: string, pageNumber: number, format: string): string {
  // 3桁まで0埋め
  const pageNumberStr = pageNumber.toString().padStart(3, '0')
  return `${baseUrl}/${filename}_${pageNumberStr}.${format}`
}

type CreatePageListParams = {
  coverPageSrc: string | null
  backCoverPageSrc: string | null
  startPageLeftRight: 'left' | 'right'
  originPageSrc: string[]
}

// 1スライド=1ページのリストを生成する
// 常に2スライドずつ追加するためリスト長は必ず偶数になり、偶数indexが見開きの先頭（視覚上の右ページ）になる
// この整列を保つため、ページのない箇所には空白スライド（kind: 'blank'）を挿入する
// idはsingle/double両モードのリストで共通になるため、モード切替時のページ位置の復元に使える
export function createPageList(params: CreatePageListParams): PageState[] {
  const { coverPageSrc, backCoverPageSrc, startPageLeftRight, originPageSrc } = params
  const pageList: PageState[] = []

  // 表紙が指定済みの場合（ない場合スキップ。空白と連続しないよう視覚上の左側に配置
  if (coverPageSrc) {
    pageList.push(
      { kind: 'blank', id: 'blank-cover', position: 'right' },
      { kind: 'page', id: 'cover', position: 'left', src: coverPageSrc },
    )
  }

  if (originPageSrc.length > 0) {
    let pairStart = 0
    if (startPageLeftRight === 'left') {
      // 本文1ページ目が左だった場合、最初の見開きは左側だけにページが入る
      pageList.push(
        { kind: 'blank', id: 'blank-head', position: 'right' },
        { kind: 'page', id: 'page-0', position: 'left', src: originPageSrc[0] },
      )
      pairStart = 1
    }
    for (let i = pairStart; i < originPageSrc.length; i += 2) {
      if (i >= originPageSrc.length - 1) {
        // 最後のページが1ページだけだった場合、右側だけにページが入る
        pageList.push(
          { kind: 'page', id: `page-${i}`, position: 'right', src: originPageSrc[i] },
          { kind: 'blank', id: 'blank-tail', position: 'left' },
        )
        break
      }
      pageList.push(
        { kind: 'page', id: `page-${i}`, position: 'right', src: originPageSrc[i] },
        { kind: 'page', id: `page-${i + 1}`, position: 'left', src: originPageSrc[i + 1] },
      )
    }
  }

  // 裏表紙が指定済みの場合（ない場合スキップ。空白と連続しないよう視覚上の右側に配置
  if (backCoverPageSrc) {
    pageList.push(
      { kind: 'page', id: 'back-cover', position: 'right', src: backCoverPageSrc },
      { kind: 'blank', id: 'blank-back-cover', position: 'left' },
    )
  }

  return pageList
}

// シリーズ作品では本編の末尾に案内スライド（次の話へ / 現在の最新話）を追加する
// 見開きモードでは2スライド単位の整列を保つため空白とペアにし、先に目が行く視覚上の右側に案内を置く
export function appendSeriesGuide(
  pageList: PageState[],
  guide: SeriesGuide | null,
  mode: 'single' | 'double',
): PageState[] {
  if (guide === null) return pageList

  const guideSlide: PageState = { kind: 'guide', id: 'series-guide', position: 'right', guide }
  if (mode === 'single') return [...pageList, guideSlide]
  return [...pageList, guideSlide, { kind: 'blank', id: 'blank-series-guide', position: 'left' }]
}
