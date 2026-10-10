import { memo } from 'react'
import { ChevronLeftIcon } from 'lucide-react'
import ComicImage from './ComicImage'
import SeriesGuideSlide from './SeriesGuideSlide'
import type { PageState, ViewMode } from './types'

// 見開きの画像。枠の高さいっぱいに出し、幅が枠に収まらないとき（縦長の画面）は object-contain で縦横比を保つ。
// max-h-fit（画像そのものの高さで頭打ちにする）は使わない。srcset の候補の幅が原本より大きいと、ブラウザが扱う画像の大きさは
// 原本より小さくなる（DPR が高いほど小さい）ので、原本の小さいページが枠の高さまで広がらなくなる
const DOUBLE_IMAGE_CLASS = 'object-contain w-auto h-full max-w-full'

type Props = {
  mode: ViewMode
  page: PageState
  // スライドが表示中（Swiper のアクティブスライド）か
  isActive: boolean
  // 画像を読み込んでよいか（表示中か先読みの対象）。許可されるまで画像は置かない
  loadable: boolean
  onSettle: (id: string) => void
}

function ComicSlide({ mode, page, isActive, loadable, onSettle }: Props) {
  // 本編の末尾の案内スライド（次の話へ / 現在の最新話）
  if (page.kind === 'guide') {
    return <SeriesGuideSlide guide={page.guide} isActive={isActive} />
  }

  // 空白スライド（見開き整列用）。single モードでは先頭・末尾の空白は除外済みのため、ここに来るのは中間の空白のみ
  if (page.kind === 'blank') {
    if (mode === 'double') {
      return <div className="h-full w-full" />
    }
    // single モードでは次ページへのガイドを表示する（RTL のため次ページは左方向）
    return (
      <div className="flex flex-col justify-center items-center h-full w-full gap-2 text-gray-400">
        <ChevronLeftIcon className="size-8" />
        <p>次のページへ</p>
      </div>
    )
  }

  if (!loadable) {
    return <div className="h-full w-full" />
  }

  const image = (className: string) => (
    <ComicImage id={page.id} src={page.src} className={className} onSettle={onSettle} />
  )

  if (mode === 'single') {
    return <div className="flex justify-center items-center h-full w-full">{image('object-contain w-auto h-full')}</div>
  }

  // mode === 'double'
  // dir=rtl 配下のため justify-start はスライド右端、justify-end はスライド左端に寄る
  switch (page.position) {
    case 'right':
      // 視覚上の右ページ: 画像を左端（中央のシーム側）に寄せる
      return <div className="h-full w-full flex justify-end items-center">{image(DOUBLE_IMAGE_CLASS)}</div>
    case 'left':
      // 視覚上の左ページ: 画像を右端（中央のシーム側）に寄せる
      return <div className="h-full w-full flex justify-start items-center">{image(DOUBLE_IMAGE_CLASS)}</div>
  }
}

export default memo(ComicSlide)
