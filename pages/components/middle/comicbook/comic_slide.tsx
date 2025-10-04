import { memo } from 'react'
import ComicImage from '@/components/small/comic_image'
import { SinglePageState, DoublePageState } from './types'

type ComicSlideProps =
  | {
      mode: 'single'
      page: SinglePageState
    }
  | {
      mode: 'double'
      page: DoublePageState
    }

function ComicSlide(props: ComicSlideProps) {
  const { mode, page } = props

  if (mode === 'single') {
    return (
      <div className="flex justify-center items-center h-full w-full">
        <ComicImage src={page.src} alt="" className="object-contain w-auto h-full" />
      </div>
    )
  }

  // mode === 'double'
  switch (page.position) {
    case 'center':
      if (typeof page.src !== 'string') return <div></div>
      return (
        <div className="flex justify-center items-center h-full w-full">
          <ComicImage src={page.src} alt="" className="object-contain h-full w-auto" />
        </div>
      )
    case 'pair':
      if (typeof page.src === 'string') return <div></div>
      return (
        <div className="h-full w-full flex items-center">
          <div className="w-1/2 h-full flex justify-end items-center">
            <ComicImage src={page.src.left} alt="" className="w-auto h-full max-h-fit max-w-full" />
          </div>
          <div className="w-1/2 h-full flex justify-start items-center">
            <ComicImage src={page.src.right} alt="" className="w-auto h-full max-h-fit max-w-full" />
          </div>
        </div>
      )
    case 'left':
      if (typeof page.src !== 'string') return <div></div>
      return (
        <div className="h-full w-full flex items-center">
          <div className="w-1/2 h-full" />
          <div className="w-1/2 h-full flex justify-start items-center">
            <ComicImage src={page.src} alt="" className="w-auto h-full max-h-fit max-w-full" />
          </div>
        </div>
      )
    case 'right':
      if (typeof page.src !== 'string') return <div></div>
      return (
        <div className="h-full w-full flex items-center">
          <div className="w-1/2 h-full flex justify-end items-center">
            <ComicImage src={page.src} alt="" className="w-auto h-full max-h-fit max-w-full" />
          </div>
          <div className="w-1/2 h-full" />
        </div>
      )
  }
}

export default memo(ComicSlide)
