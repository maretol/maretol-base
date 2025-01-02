'use client'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/button'
import { rewriteImageURL } from '@/lib/image'
import { originImageOption } from '@/lib/static'
import ClientImage from '../small/client_image'
import { preload } from 'react-dom'
import ComicImage from '../small/comic_image'
import { cn } from '@/lib/utils'

type ComicBookProps = {
  originPageSrc: string[]
  coverPageSrc: string
  backCoverPageSrc: string
  startPageLeftRight: 'left' | 'right'
}

type pageState = {
  position: 'left' | 'right' | 'center' | 'pair'
  src: string[] | string
}

export default function ComicBook(props: ComicBookProps) {
  const { originPageSrc, coverPageSrc, backCoverPageSrc, startPageLeftRight } = props

  const [currentPage, setCurrentPage] = useState(0)

  const memoPageList = useMemo(() => {
    const pageList = [{ position: 'center', src: coverPageSrc }] as pageState[] // 表紙
    if (startPageLeftRight === 'left') {
      // 本文1ページ目が左だった場合、最初のページは左だけで、そこから残りのページは2ページペアで処理する
      pageList.push({ position: 'left', src: originPageSrc[0] })
      for (let i = 1; i < originPageSrc.length; i += 2) {
        if (i >= originPageSrc.length - 1) {
          // 最後のページが1ページだけだった場合
          pageList.push({ position: 'right', src: originPageSrc[i] })
          break
        }
        pageList.push({ position: 'pair', src: [originPageSrc[i], originPageSrc[i + 1]] })
      }
    } else {
      // 本文1ページ目が右だった場合、最初から2ページペアで処理する
      for (let i = 0; i < originPageSrc.length; i += 2) {
        if (i >= originPageSrc.length - 1) {
          // 最後のページが1ページだけだった場合
          pageList.push({ position: 'right', src: originPageSrc[i] })
          break
        }
        pageList.push({ position: 'pair', src: [originPageSrc[i], originPageSrc[i + 1]] })
      }
    }
    pageList.push({ position: 'center', src: backCoverPageSrc }) // 裏表紙
    return pageList
  }, [startPageLeftRight, coverPageSrc, backCoverPageSrc, originPageSrc])

  const leftClick = useCallback(() => {
    setCurrentPage((prev) => (memoPageList.length - 1 === prev ? prev : prev + 1))
  }, [memoPageList.length])

  const rightClick = useCallback(() => {
    setCurrentPage((prev) => (prev === 0 ? prev : prev - 1))
  }, [])

  const keyEvent = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const key = e.code

    if (key === 'ArrowLeft') {
      leftClick()
    }
    if (key === 'ArrowRight') {
      rightClick()
    }
  }

  return (
    <div className="h-screen w-full bg-gray-700 static" onKeyDown={keyEvent} tabIndex={0}>
      <div className="absolute left-0 top-0 h-full flex justify-center items-center bg-gray-500 opacity-50">
        <Button className="h-full w-full" variant="ghost" onClick={leftClick}>
          <ChevronLeftIcon className="text-white h-20 w-20" />
        </Button>
      </div>
      <div className="absolute right-0 top-0 h-full flex justify-center items-center bg-gray-500 opacity-50">
        <Button className="h-full w-full" variant="ghost" onClick={rightClick}>
          <ChevronRightIcon className="text-white h-20 w-20" />
        </Button>
      </div>
      <div className="text-white h-full w-full">
        {memoPageList.map((page, i) => {
          const src = typeof page.src === 'string' ? page.src : page.src[0]
          switch (page.position) {
            case 'center':
              return (
                <div
                  key={i}
                  className={cn('h-full w-full flex justify-center items-center', i === currentPage ? '' : 'hidden')}
                >
                  <ComicImage src={src} alt="" className="w-auto h-full max-h-fit max-w-fit" />
                </div>
              )
            case 'pair':
              return (
                <div
                  key={i}
                  className={cn('h-full w-full flex justify-center items-center', i === currentPage ? '' : 'hidden')}
                >
                  {/** 番号は右が若いページ、表示は左から処理するため入れ替えてる */}
                  <ComicImage src={page.src[1]} alt="" className="w-auto h-full max-h-fit max-w-[50%]" />
                  <ComicImage src={page.src[0]} alt="" className="w-auto h-full max-h-fit max-w-[50%]" />
                </div>
              )
            case 'left':
              return (
                <div
                  key={i}
                  className={cn('h-full w-full flex justify-center items-center', i === currentPage ? '' : 'hidden')}
                >
                  <ComicImage src={src} alt="" className="w-auto h-full max-h-fit max-w-[50%]" />
                  <div className="w-[50%]"></div>
                </div>
              )
            case 'right':
              return (
                <div
                  key={i}
                  className={cn('h-full w-full flex justify-center items-center', i === currentPage ? '' : 'hidden')}
                >
                  <div className="w-[50%]" />
                  <ComicImage src={src} alt="" className="w-auto h-full max-h-fit max-w-[50%]" />
                </div>
              )
          }
        })}
      </div>
    </div>
  )
}
