'use client'

import { ChevronLeftIcon, ChevronRightIcon, SettingsIcon } from 'lucide-react'
import React, { use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../ui/button'
import { getHeaderImage } from '@/lib/image'
import ClientImage from '../small/client_image'
import ComicImage from '../small/comic_image'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { bandeDessineeResult } from 'api-types'
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from '../ui/carousel'
import useWindowSize from '@/lib/hook/use_window_size'
import { Switch } from '../ui/switch'
import { Label } from '../ui/label'
import { Slider } from '../ui/slider'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

type ComicBookProps = {
  cmsResult: Promise<bandeDessineeResult>
}

type siglePageState = {
  position: 'left' | 'right' | 'center'
  src: string
}

type doublePageState = {
  position: 'left' | 'right' | 'center' | 'pair'
  src: string | { left: string; right: string }
}

type pageOption = {
  mode_static: boolean // モード固定
  controller_visible: boolean // コントローラー表示
  controller_disabled: boolean // コントローラー無効
}

const initPageOption: pageOption = {
  mode_static: false,
  controller_visible: false,
  controller_disabled: false,
}

// シングルモードとダブルモード（見開き）の切り替えの幅のしきい値
// 指定未満の場合シングルモードになる
const modeThreshold = 980

export default function ComicBook(props: ComicBookProps) {
  const { cmsResult } = props
  const data = use(cmsResult)

  const baseUrl = data.contents_url.replaceAll('/index.json', '')
  const filename = data.filename
  const startPage = data.first_page
  const lastPage = data.last_page
  const format = data.format[0]
  const pageArray = Array.from({ length: lastPage - startPage + 1 }, (_, i) => i + startPage)

  const coverPageSrc = data.cover ? baseUrl + '/' + data.cover : null
  const backCoverPageSrc = data.back_cover ? baseUrl + '/' + data.back_cover : null
  const startPageLeftRight = data.first_left_right[0]
  // マンガの画像srcはComicImageコンポーネントでCDN経由のURLに変換している
  const originPageSrc = pageArray.map((i) => getPageImageSrc(baseUrl, filename, i, format))

  const headerImage = getHeaderImage()
  const [currentPage, setCurrentPage] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>()
  const [mode, setMode] = useState<'single' | 'double'>('single')
  const [pageOption, setPageOption] = useState<pageOption>(initPageOption)
  const [api, setApi] = useState<CarouselApi>()
  const [zoneFlag, setZoneFlag] = useState<'next' | 'prev' | 'none'>('none')
  const [width, height] = useWindowSize()
  const comicDivRef = useRef<HTMLDivElement>(null)

  const singlePageList = useMemo(() => {
    const pageList: siglePageState[] = []
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
      pageList.push({ position: 'center', src: backCoverPageSrc }) // 裏表紙
    }

    return pageList
  }, [startPageLeftRight, coverPageSrc, backCoverPageSrc, originPageSrc])

  const doublePageList = useMemo(() => {
    const pageList: doublePageState[] = []
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
      pageList.push({ position: 'center', src: backCoverPageSrc }) // 裏表紙
    }

    return pageList
  }, [startPageLeftRight, coverPageSrc, backCoverPageSrc, originPageSrc])

  const leftClick = useCallback(() => {
    api?.scrollNext()
  }, [api])

  const rightClick = useCallback(() => {
    api?.scrollPrev()
  }, [api])

  const keyEvent = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const key = e.code

    if (key === 'ArrowLeft') {
      leftClick()
    }
    if (key === 'ArrowRight') {
      rightClick()
    }
  }

  const mouseMoveEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const comicWidth = comicDivRef.current?.clientWidth
    if (!comicWidth) return
    const nextZone = comicWidth / 3
    const prevZone = (comicWidth / 3) * 2
    if (e.clientX < nextZone) {
      setZoneFlag('next')
    } else if (e.clientX > prevZone) {
      setZoneFlag('prev')
    } else {
      setZoneFlag('none')
    }
  }

  const mouseClickEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const comicWidth = comicDivRef.current?.clientWidth
    if (!comicWidth) return
    const nextZone = comicWidth / 3
    const prevZone = (comicWidth / 3) * 2
    if (e.clientX < nextZone) {
      leftClick()
    } else if (e.clientX > prevZone) {
      rightClick()
    }
  }

  const onInit = useCallback(
    (api: CarouselApi) => {
      setScrollSnaps(api?.scrollSnapList())
    },
    [api]
  )

  const onSelected = useCallback(
    (api: CarouselApi) => {
      if (!api) return
      setCurrentPage(api.selectedScrollSnap())
    },
    [api]
  )

  const changeContollerVisible = useCallback(
    (controller_visible: boolean) => {
      setPageOption((props) => {
        const newProps = { ...props, controller_visible }
        localStorage.setItem('page_option', JSON.stringify(newProps))
        return newProps
      })
    },
    [pageOption]
  )

  const changeModeStatic = useCallback(
    (mode_static: boolean) => {
      setPageOption((props) => {
        const newProps = { ...props, mode_static }
        localStorage.setItem('page_option', JSON.stringify(newProps))
        return newProps
      })
    },
    [pageOption]
  )

  const changeContollerDisabled = useCallback(
    (controller_disabled: boolean) => {
      setPageOption((props) => {
        const newProps = { ...props, controller_disabled }
        localStorage.setItem('page_option', JSON.stringify(newProps))
        return newProps
      })
    },
    [pageOption]
  )

  useEffect(() => {
    const opt = localStorage.getItem('page_option')
    if (opt) {
      setPageOption(JSON.parse(opt))
    }
  }, [])

  useEffect(() => {
    if (!api) return

    onInit(api)
    onSelected(api)
    api.on('reInit', onInit).on('reInit', onSelected).on('select', onSelected)
  }, [api, onInit, onSelected])

  useEffect(() => {
    if (width < modeThreshold) {
      if (mode === 'single' || pageOption.mode_static) return
      setMode('single')
    } else {
      if (mode === 'double' || pageOption.mode_static) return
      setMode('double')
    }
  }, [width, pageOption.mode_static])

  return (
    <div className="h-[95svh] w-full bg-gray-700" onKeyDown={keyEvent} tabIndex={0}>
      <div
        className={cn(
          'absolute z-50 top-0 left-0 w-full flex justify-center items-center bg-gray-300',
          'transition-opacity ease-in-out duration-100 opacity-0 hover:opacity-70'
        )}
      >
        <div className="pt-10 bg-gray-300 w-full max-w-[1500px]">
          <Button variant={'link'} className="p-0" asChild>
            <Link href="/">
              <ClientImage src={headerImage} width={500} height={200} alt="Maretol Base" />
            </Link>
          </Button>
        </div>
      </div>
      <div
        className={cn('text-white h-full max-h-[96%] w-full relative', 'comic-zone')}
        ref={comicDivRef}
        onClick={mouseClickEvent}
        onMouseMove={mouseMoveEvent}
      >
        <Carousel opts={{ direction: 'rtl', duration: 17 }} dir="rtl" setApi={setApi} className="h-full w-full">
          <CarouselContent className="h-full w-full -pl-4">
            {mode === 'single' &&
              singlePageList.map((page, i) => (
                <CarouselItem key={i} className="h-full w-max flex justify-center items-center pl-0">
                  <div className="h-full w-max flex items-center">
                    <ComicImage src={page.src} alt="" className="object-contain w-auto h-full" />
                  </div>
                </CarouselItem>
              ))}
            {mode === 'double' &&
              doublePageList.map((page, i) => {
                switch (page.position) {
                  case 'center':
                    if (typeof page.src !== 'string') return <div key={i}></div>
                    return (
                      <CarouselItem key={i} className="h-full w-full flex justify-center items-center">
                        <ComicImage src={page.src} alt="" className="object-contain h-full w-auto" />
                      </CarouselItem>
                    )
                  case 'pair':
                    if (typeof page.src === 'string') return <div key={i}></div>
                    return (
                      <CarouselItem key={i} className="h-full w-full">
                        <div className="h-full w-full flex items-center">
                          <div className="w-1/2 h-full flex justify-end items-center">
                            <ComicImage src={page.src.left} alt="" className="w-auto h-full max-h-fit max-w-full" />
                          </div>
                          <div className="w-1/2 h-full flex justify-start items-center">
                            <ComicImage src={page.src.right} alt="" className="w-auto h-full max-h-fit max-w-full" />
                          </div>
                        </div>
                      </CarouselItem>
                    )
                  case 'left':
                    if (typeof page.src !== 'string') return <div key={i}></div>
                    return (
                      <CarouselItem key={i} className="h-full w-full">
                        <div className="h-full w-full flex items-center">
                          <div className="w-1/2 h-full" />
                          <div className="w-1/2 h-full flex justify-start items-center">
                            <ComicImage src={page.src} alt="" className="w-auto h-full max-h-fit max-w-full" />
                          </div>
                        </div>
                      </CarouselItem>
                    )
                  case 'right':
                    if (typeof page.src !== 'string') return <div key={i}></div>
                    return (
                      <CarouselItem key={i} className="h-full w-full">
                        <div className="h-full w-full flex items-center">
                          <div className="w-1/2 h-full flex justify-end items-center">
                            <ComicImage src={page.src} alt="" className="w-auto h-full max-h-fit max-w-full" />
                          </div>
                          <div className="w-1/2 h-full" />
                        </div>
                      </CarouselItem>
                    )
                }
              })}
          </CarouselContent>
          <div className={cn(pageOption.controller_disabled && 'hidden')} onKeyDown={keyEvent} tabIndex={0}>
            <ChevronLeftIcon
              className={cn(
                'text-white h-20 w-20',
                'absolute left-0 top-1/2 flex justify-center items-center opacity-30',
                pageOption.controller_visible && 'opacity-100',
                zoneFlag === 'next' && 'opacity-100'
              )}
            />
            <ChevronRightIcon
              className={cn(
                'text-white h-20 w-20',
                'absolute right-0 top-1/2 flex justify-center items-center opacity-30',
                pageOption.controller_visible && 'opacity-100',
                zoneFlag === 'prev' && 'opacity-100'
              )}
            />
          </div>
        </Carousel>
      </div>
      <div className="relative bg-gray-700 h-[4%] w-full text-white text-center flex justify-center items-center">
        <div className="flex justify-center items-center w-[90%]">
          {mode === 'single' && (
            <div className="w-max flex justify-center items-center space-x-2">
              <Slider
                dir="rtl"
                min={0}
                max={singlePageList.length - 1}
                value={[currentPage]}
                className="w-72"
                onValueChange={(value: number[]) => {
                  const [v] = value
                  setCurrentPage(v)
                  api?.scrollTo(v)
                }}
              />
              <p>
                Page: {currentPage + 1}/{singlePageList.length}
              </p>
            </div>
          )}
          {mode === 'double' && (
            <div className="w-max flex jsutify-center items-center space-x-2">
              <Slider
                dir="rtl"
                min={0}
                max={doublePageList.length - 1}
                value={[currentPage]}
                className="w-96"
                onValueChange={(value: number[]) => {
                  const [v] = value
                  setCurrentPage(v)
                  api?.scrollTo(v)
                }}
              />
              <p>
                Page: {currentPage + 1}/{doublePageList.length}
              </p>
            </div>
          )}
        </div>
        <div className="absolute right-0 inset-y-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-full">
                <SettingsIcon className="h-6 w-6" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="controller_visible"
                  className="data-[state=checked]:bg-blue-900"
                  checked={pageOption.controller_visible}
                  onCheckedChange={changeContollerVisible}
                />
                <Label htmlFor="controller_visible">ページ送りボタンを見やすくする</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="controller_disabled"
                  className="data-[state=checked]:bg-blue-900"
                  checked={pageOption.controller_disabled}
                  onCheckedChange={changeContollerDisabled}
                />
                <Label htmlFor="controller_disabled">ページ送りボタンを非表示にする</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="mode"
                  className="data-[state=checked]:bg-blue-900"
                  checked={pageOption.mode_static}
                  onCheckedChange={changeModeStatic}
                />
                {mode === 'double' && <Label htmlFor="mode">見開き表示で固定する</Label>}
                {mode === 'single' && <Label htmlFor="mode">単ページ表示で固定する</Label>}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}

function getPageImageSrc(baseUrl: string, filename: string, pageNumber: number, format: string) {
  // 3桁まで0埋め
  const pageNumberStr = pageNumber.toString().padStart(3, '0')
  return `${baseUrl}/${filename}_${pageNumberStr}.${format}`
}
