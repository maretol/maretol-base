import { memo } from 'react'
import { ChevronLeftIcon } from 'lucide-react'
import ComicImage from '@/components/small/comic_image'
import SeriesGuideSlide from './series_guide_slide'
import { PageState } from './types'

type ComicSlideProps = {
  mode: 'single' | 'double'
  page: PageState
}

function ComicSlide(props: ComicSlideProps) {
  const { mode, page } = props

  // 本編の末尾の案内スライド（次の話へ / 現在の最新話）
  if (page.kind === 'guide') {
    return <SeriesGuideSlide guide={page.guide} />
  }

  // 空白スライド（見開き整列用）。singleモードでは先頭・末尾の空白は除外済みのため、ここに来るのは中間の空白のみ
  if (page.kind === 'blank') {
    if (mode === 'double') {
      return <div className="h-full w-full" />
    }
    // singleモードでは次ページへのガイドを表示する（RTLのため次ページは左方向）
    return (
      <div className="flex flex-col justify-center items-center h-full w-full gap-2 text-gray-400">
        <ChevronLeftIcon className="size-8" />
        <p>次のページへ</p>
      </div>
    )
  }

  if (mode === 'single') {
    return (
      <div className="flex justify-center items-center h-full w-full">
        <ComicImage src={page.src} alt="" className="object-contain w-auto h-full" />
      </div>
    )
  }

  // mode === 'double'
  // dir=rtl配下のためjustify-startはスライド右端、justify-endはスライド左端に寄る
  switch (page.position) {
    case 'center':
      // 表紙・裏表紙はスライド内で中央寄せ
      return (
        <div className="flex justify-center items-center h-full w-full">
          <ComicImage src={page.src} alt="" className="object-contain h-full w-auto" />
        </div>
      )
    case 'right':
      // 視覚上の右ページ: 画像を左端（中央のシーム側）に寄せる
      return (
        <div className="h-full w-full flex justify-end items-center">
          <ComicImage src={page.src} alt="" className="w-auto h-full max-h-fit max-w-full" />
        </div>
      )
    case 'left':
      // 視覚上の左ページ: 画像を右端（中央のシーム側）に寄せる
      return (
        <div className="h-full w-full flex justify-start items-center">
          <ComicImage src={page.src} alt="" className="w-auto h-full max-h-fit max-w-full" />
        </div>
      )
  }
}

export default memo(ComicSlide)
