import { memo } from 'react'
import { ChevronLeftIcon } from 'lucide-react'
import ComicImage from './ComicImage'
import SeriesGuideSlide from './SeriesGuideSlide'
import type { PageState, ViewMode } from './types'

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
    case 'center':
      // 表紙・裏表紙はスライド内で中央寄せ
      return (
        <div className="flex justify-center items-center h-full w-full">{image('object-contain h-full w-auto')}</div>
      )
    case 'right':
      // 視覚上の右ページ: 画像を左端（中央のシーム側）に寄せる
      return (
        <div className="h-full w-full flex justify-end items-center">{image('w-auto h-full max-h-fit max-w-full')}</div>
      )
    case 'left':
      // 視覚上の左ページ: 画像を右端（中央のシーム側）に寄せる
      return (
        <div className="h-full w-full flex justify-start items-center">
          {image('w-auto h-full max-h-fit max-w-full')}
        </div>
      )
  }
}

export default memo(ComicSlide)
