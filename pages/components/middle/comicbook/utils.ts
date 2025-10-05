import { SinglePageState, DoublePageState } from './types'

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

export function createSinglePageList(params: CreatePageListParams): SinglePageState[] {
  const { coverPageSrc, backCoverPageSrc, startPageLeftRight, originPageSrc } = params
  const pageList: SinglePageState[] = []

  // 表紙が指定済みの場合（ない場合スキップ
  if (coverPageSrc) {
    pageList.push({ position: 'center', src: coverPageSrc })
  }

  if (startPageLeftRight === 'left') {
    // 本文1ページ目が左だった場合、最初のページは左でその次が交互に左右でセットされる
    originPageSrc.forEach((src, i) => {
      const position = i % 2 === 0 ? 'left' : 'right'
      pageList.push({ position, src })
    })
  } else {
    // 本文1ページ目が右だった場合、最初のページは右でその次が交互に左右でセットされる
    originPageSrc.forEach((src, i) => {
      const position = i % 2 === 0 ? 'right' : 'left'
      pageList.push({ position, src })
    })
  }

  // 裏表紙が指定済みの場合（ない場合スキップ
  if (backCoverPageSrc) {
    pageList.push({ position: 'center', src: backCoverPageSrc })
  }

  return pageList
}

export function createDoublePageList(params: CreatePageListParams): DoublePageState[] {
  const { coverPageSrc, backCoverPageSrc, startPageLeftRight, originPageSrc } = params
  const pageList: DoublePageState[] = []

  // 表紙が指定済みの場合追加
  if (coverPageSrc) {
    pageList.push({ position: 'center', src: coverPageSrc })
  }

  if (startPageLeftRight === 'left') {
    // 本文1ページ目が左だった場合、最初のページは左だけで、そこから残りのページは2ページペアで処理する
    pageList.push({ position: 'left', src: originPageSrc[0] })
    for (let i = 1; i < originPageSrc.length; i += 2) {
      if (i >= originPageSrc.length - 1) {
        // 最後のページが1ページだけだった場合
        pageList.push({ position: 'right', src: originPageSrc[i] })
        break
      }
      pageList.push({ position: 'pair', src: { left: originPageSrc[i], right: originPageSrc[i + 1] } })
    }
  } else {
    // 本文1ページ目が右だった場合、最初から2ページペアで処理する
    for (let i = 0; i < originPageSrc.length; i += 2) {
      if (i >= originPageSrc.length - 1) {
        // 最後のページが1ページだけだった場合
        pageList.push({ position: 'right', src: originPageSrc[i] })
        break
      }
      pageList.push({ position: 'pair', src: { left: originPageSrc[i], right: originPageSrc[i + 1] } })
    }
  }

  // 裏表紙が指定済みの場合（ない場合スキップ
  if (backCoverPageSrc) {
    pageList.push({ position: 'center', src: backCoverPageSrc })
  }

  return pageList
}
