import { getPageFileName } from '@/lib/comic'
import type { ComicViewerData, PageState, SeriesGuide, ViewMode } from './types'

// 1 スライド = 1 ページのリストを生成する
// 常に 2 スライドずつ追加するためリスト長は必ず偶数になり、偶数 index が見開きの先頭（視覚上の右ページ）になる
// この整列を保つため、ページのない箇所には空白スライド（kind: 'blank'）を挿入する
// id は single / double 両モードのリストで共通になるため、モード切替時のページ位置の復元に使える
export function createPageList(comic: ComicViewerData): PageState[] {
  const { baseURL, filename, format, firstPage, lastPage, cover, backCover, firstLeftRight } = comic
  const pageSrcs = Array.from(
    { length: lastPage - firstPage + 1 },
    (_, i) => `${baseURL}/${getPageFileName(filename, i + firstPage, format)}`,
  )
  const pageList: PageState[] = []

  // 表紙が指定済みの場合（ない場合スキップ）。空白と連続しないよう視覚上の左側に配置
  if (cover) {
    pageList.push(
      { kind: 'blank', id: 'blank-cover', position: 'right' },
      { kind: 'page', id: 'cover', position: 'left', src: `${baseURL}/${cover}` },
    )
  }

  if (pageSrcs.length > 0) {
    let pairStart = 0
    if (firstLeftRight === 'left') {
      // 本文 1 ページ目が左だった場合、最初の見開きは左側だけにページが入る
      pageList.push(
        { kind: 'blank', id: 'blank-head', position: 'right' },
        { kind: 'page', id: 'page-0', position: 'left', src: pageSrcs[0] },
      )
      pairStart = 1
    }
    for (let i = pairStart; i < pageSrcs.length; i += 2) {
      if (i >= pageSrcs.length - 1) {
        // 最後のページが 1 ページだけだった場合、右側だけにページが入る
        pageList.push(
          { kind: 'page', id: `page-${i}`, position: 'right', src: pageSrcs[i] },
          { kind: 'blank', id: 'blank-tail', position: 'left' },
        )
        break
      }
      pageList.push(
        { kind: 'page', id: `page-${i}`, position: 'right', src: pageSrcs[i] },
        { kind: 'page', id: `page-${i + 1}`, position: 'left', src: pageSrcs[i + 1] },
      )
    }
  }

  // 裏表紙が指定済みの場合（ない場合スキップ）。空白と連続しないよう視覚上の右側に配置
  if (backCover) {
    pageList.push(
      { kind: 'page', id: 'back-cover', position: 'right', src: `${baseURL}/${backCover}` },
      { kind: 'blank', id: 'blank-back-cover', position: 'left' },
    )
  }

  return pageList
}

// single モードでは先頭・末尾の空白スライド（見開き整列用）は不要なため除外する
export function toSinglePageList(pageList: PageState[]): PageState[] {
  return pageList.filter((page, i) => !(page.kind === 'blank' && (i === 0 || i === pageList.length - 1)))
}

// シリーズ作品では本編の末尾に案内スライド（次の話へ / 現在の最新話）を追加する
// 見開きモードでは 2 スライド単位の整列を保つため空白とペアにし、先に目が行く視覚上の右側に案内を置く
export function appendSeriesGuide(pageList: PageState[], guide: SeriesGuide | null, mode: ViewMode): PageState[] {
  if (guide === null) {
    return pageList
  }
  const guideSlide: PageState = { kind: 'guide', id: 'series-guide', position: 'right', guide }
  if (mode === 'single') {
    return [...pageList, guideSlide]
  }
  return [...pageList, guideSlide, { kind: 'blank', id: 'blank-series-guide', position: 'left' }]
}

// 読み込みを許可するスライドの ID（astro_design.md 5 章の「順次先読み」）
// - 表示中のスライドは常に読み込む
// - それ以外は、進む方向に AHEAD 枚、戻る方向に BEHIND 枚までを先読みの候補にし、
//   読み込み中の画像が CONCURRENCY 枚以下になるように順に許可する（全ページを一斉に要求しない）
// 表示中・候補・読み込み済みから決まる純粋な計算なので、画像が読み込まれるたびに呼び直す
const PRELOAD_AHEAD = 4
const PRELOAD_BEHIND = 2
const PRELOAD_CONCURRENCY = 2

export function getLoadableIDs(
  pageList: PageState[],
  activeIndex: number,
  perView: number,
  settled: ReadonlySet<string>,
): Set<string> {
  const isImage = (page: PageState | undefined): page is PageState & { kind: 'page' } => page?.kind === 'page'
  const visible = pageList.slice(activeIndex, activeIndex + perView).filter(isImage)
  const loadable = new Set(visible.map((page) => page.id))

  const queue = [
    ...pageList.slice(activeIndex + perView, activeIndex + perView + PRELOAD_AHEAD),
    ...pageList.slice(Math.max(activeIndex - PRELOAD_BEHIND, 0), activeIndex).reverse(),
  ].filter(isImage)
  let pending = visible.filter((page) => !settled.has(page.id)).length
  for (const page of queue) {
    if (pending >= PRELOAD_CONCURRENCY) {
      break
    }
    loadable.add(page.id)
    if (!settled.has(page.id)) {
      pending++
    }
  }
  return loadable
}
