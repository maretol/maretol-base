'use client'

import React, { use, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Swiper, SwiperClass, SwiperSlide } from 'swiper/react'
import { Keyboard } from 'swiper/modules'
import { Button } from '@/components/ui/button'
import { getHeaderImageURL } from '@/lib/image'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { bandeDessineeResult } from 'api-types'
import useWindowSize from '@/lib/hook/use_window_size'
import ClientImage2 from '@/components/small/client_image2'
import { comicScrollSpeed } from '@/lib/static'
import { usePageOptions } from '@/lib/hook/use_page_options'
import { useViewMode } from '@/lib/hook/use_view_mode'
import { useZoneDetection } from '@/lib/hook/use_zone_detection'
import ComicSlide from './comic_slide'
import PageController from './page_controller'
import NavigationIcons from './navigation_icons'
import ComicSettingsPopover from './settings_popover'
import { getPageImageSrc, createPageList, appendSeriesGuide } from './utils'
import { SeriesGuide } from './types'
import { LAYOUT, SWIPER } from './constants'
import 'swiper/css'

// dir=rtl のSwiperで「次のページ」方向にあたるキー（KeyboardモジュールのRTL時の判定と同じ）
const NEXT_PAGE_KEYS = ['ArrowLeft', 'PageUp']

type ComicBookProps = {
  cmsResult: Promise<bandeDessineeResult>
}

export default function ComicBook(props: ComicBookProps) {
  const { cmsResult } = props
  const data = use(cmsResult)
  const router = useRouter()

  const baseUrl = data.contents_url.replaceAll('/index.json', '')
  const filename = data.filename
  const startPage = data.first_page
  const lastPage = data.last_page
  const format = data.format[0]
  // メモ化しないと毎レンダーで再生成され、下流のuseMemo（originPageSrc/pageList）が毎回作り直されてしまう
  const pageArray = useMemo(
    () => Array.from({ length: lastPage - startPage + 1 }, (_, i) => i + startPage),
    [startPage, lastPage],
  )

  const coverPageSrc = data.cover ? baseUrl + '/' + data.cover : null
  const backCoverPageSrc = data.back_cover ? baseUrl + '/' + data.back_cover : null
  const startPageLeftRight = data.first_left_right[0]
  // マンガの画像srcはComicImageコンポーネントでCDN経由のURLに変換している
  const originPageSrc = useMemo(
    () => pageArray.map((i) => getPageImageSrc(baseUrl, filename, i, format)),
    [pageArray, baseUrl, filename, format],
  )

  // シリーズ作品のときだけ末尾に案内スライドを出す
  // next_idは配信側（cms-data-fetcher）で公開済みの巻に限定されているため、ここでは有無だけ見ればよい
  const seriesId = data.series?.id ?? null
  const nextId = data.next_id ?? null
  const seriesGuide = useMemo<SeriesGuide | null>(
    () => (seriesId === null ? null : { seriesId, nextId }),
    [seriesId, nextId],
  )

  const headerImage = getHeaderImageURL()
  const [currentPage, setCurrentPage] = useState(0)
  const [swiperInstance, setSwiperInstance] = useState<SwiperClass | null>(null)
  const [width] = useWindowSize()
  const comicDivRef = useRef<HTMLDivElement>(null)

  const { pageOption, changeControllerVisible, changeModeStatic, changeControllerDisabled } = usePageOptions()
  const mode = useViewMode(width, pageOption.mode_static)
  const { zoneFlag, mouseMoveEvent, mouseClickEvent, mouseLeaveEvent } = useZoneDetection(comicDivRef)

  // 本編のスライドリスト（表紙・本文・裏表紙と見開き整列用の空白）
  const bookPageList = useMemo(
    () =>
      createPageList({
        coverPageSrc,
        backCoverPageSrc,
        startPageLeftRight,
        originPageSrc,
      }),
    [startPageLeftRight, coverPageSrc, backCoverPageSrc, originPageSrc],
  )

  // singleモードでは先頭・末尾の空白スライド（見開き整列用）は不要なため除外する
  const singleBookPageList = useMemo(
    () => bookPageList.filter((page, i) => !(page.kind === 'blank' && (i === 0 || i === bookPageList.length - 1))),
    [bookPageList],
  )

  const displayBookPageList = mode === 'double' ? bookPageList : singleBookPageList
  // 実際に表示するスライドリスト。シリーズ作品では本編の末尾に案内スライドが付く
  const displayPageList = useMemo(
    () => appendSeriesGuide(displayBookPageList, seriesGuide, mode),
    [displayBookPageList, seriesGuide, mode],
  )
  // ページカウンター・スライダーは本編だけを対象にする（末尾の案内スライドは数えない）
  const totalPages = displayBookPageList.length

  // 表示中ページの論理ID。モード切替でスライドリストが差し替わったときの位置復元に使う
  // 差し替え直後はcurrentPageが旧リストのindexのままなので、復元（下のuseLayoutEffect）より後に更新されるよう通常のuseEffectで持つ
  const currentPageIdRef = useRef<string | null>(null)
  useEffect(() => {
    currentPageIdRef.current = displayPageList[currentPage]?.id ?? currentPageIdRef.current
  }, [currentPage, displayPageList])

  // モード切替でリストが差し替わるとactiveIndexが別のページを指してしまうため、同じページIDの位置へ即時移動して復元する
  // モードが実際に変わったときだけ動かす（それ以外のレンダーで動くと通常のページ送りと競合する）
  const prevModeRef = useRef(mode)
  useLayoutEffect(() => {
    if (prevModeRef.current === mode) return
    if (!swiperInstance || swiperInstance.destroyed) return
    prevModeRef.current = mode
    const pageId = currentPageIdRef.current
    if (pageId === null) return

    let index = displayPageList.findIndex((page) => page.id === pageId)
    if (index < 0) {
      // singleモードで除外される空白スライド（先頭・末尾・案内スライドの対）にいた場合は最寄りの端ページへ
      index = bookPageList[0]?.id === pageId ? 0 : displayPageList.length - 1
    }
    if (mode === 'double') {
      // 見開きの先頭（偶数index）に揃える
      index -= index % 2
    }
    if (index !== swiperInstance.activeIndex) {
      swiperInstance.slideTo(index, 0)
    }
  }, [mode, swiperInstance, displayPageList, bookPageList])

  // 末尾の案内スライドの表示が完了しているか。表示中にもう一度「次へ」操作をしたときだけ次の話へ遷移する
  // 案内に到達した操作の連打で案内を見る前に遷移してしまわないよう、スライド切替の開始で下ろし、完了で立てる
  const [guideVisible, setGuideVisible] = useState(false)
  const canGoToNextEpisode = guideVisible && nextId !== null

  const handleNextPage = useCallback(() => {
    if (canGoToNextEpisode) {
      router.push(`/comics/${nextId}`)
      return
    }
    if (!swiperInstance) return
    swiperInstance.slideNext(comicScrollSpeed)
  }, [swiperInstance, canGoToNextEpisode, nextId, router])

  const handlePrevPage = useCallback(() => {
    if (!swiperInstance) return
    swiperInstance.slidePrev(comicScrollSpeed)
  }, [swiperInstance])

  // キーボードのページ送りはSwiperのKeyboardモジュールがdocumentで処理しており、末尾では何も起きない
  // 案内スライドの表示中に「次へ」方向のキーが改めて押されたときだけ次の話へ遷移する（押しっぱなしのリピートは無視）
  useEffect(() => {
    if (!canGoToNextEpisode) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!NEXT_PAGE_KEYS.includes(e.key) || e.repeat) return
      if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return
      // スライダーやフォーム要素の操作中のキーは対象外（Keyboardモジュールも同様に無視する）
      if (
        e.target instanceof HTMLElement &&
        e.target.closest('input, textarea, select, [role="slider"], [contenteditable]')
      ) {
        return
      }
      router.push(`/comics/${nextId}`)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [canGoToNextEpisode, nextId, router])

  const handleMouseClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      mouseClickEvent(e, handleNextPage, handlePrevPage)
    },
    [mouseClickEvent, handleNextPage, handlePrevPage],
  )

  return (
    <div className={cn(LAYOUT.MAIN_HEIGHT, 'w-full bg-gray-700')} tabIndex={0}>
      <div
        className={cn(
          'absolute z-50 top-0 left-0 w-full flex justify-center items-center bg-gray-300',
          'transition-opacity ease-in-out duration-100 opacity-0 hover:opacity-70',
        )}
      >
        <div className="pt-10 bg-gray-300 w-full max-w-375">
          <Button variant={'link'} className="p-0" asChild>
            <Link href="/">
              <ClientImage2
                src={headerImage}
                width={300}
                height={100}
                alt="Maretol Base"
                className="w-full h-auto object-contain"
              />
            </Link>
          </Button>
        </div>
      </div>
      <div
        className={cn('text-white h-full', LAYOUT.VIEWER_HEIGHT, 'w-full relative comic-zone')}
        ref={comicDivRef}
        onClick={handleMouseClick}
        onMouseMove={mouseMoveEvent}
        onMouseLeave={mouseLeaveEvent}
      >
        <Swiper
          modules={[Keyboard]}
          dir={'rtl'}
          speed={comicScrollSpeed}
          slidesPerView={mode === 'double' ? 2 : 1}
          slidesPerGroup={mode === 'double' ? 2 : 1}
          onSwiper={setSwiperInstance}
          onActiveIndexChange={(swiper) => {
            setCurrentPage(swiper.activeIndex)
            setGuideVisible(false)
          }}
          // speed 0 のslideTo（モード切替時の位置復元）でも同期的に呼ばれる
          onTransitionEnd={(swiper) => {
            setGuideVisible(displayPageList[swiper.activeIndex]?.kind === 'guide')
          }}
          keyboard={{ enabled: true }}
          className="h-full w-full"
          lazyPreloadPrevNext={SWIPER.LAZY_PRELOAD}
        >
          {displayPageList.map((page) => (
            <SwiperSlide key={page.id}>
              <ComicSlide mode={mode} page={page} />
            </SwiperSlide>
          ))}
          <NavigationIcons
            pageOption={pageOption}
            zoneFlag={zoneFlag}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
          />
        </Swiper>
      </div>
      <div
        className={cn(
          'relative bg-gray-700',
          LAYOUT.FOOTER_HEIGHT,
          'w-full text-white text-center flex justify-center items-center',
        )}
      >
        <div className="flex justify-center items-center w-[90%]">
          <PageController
            mode={mode}
            currentPage={currentPage}
            totalPages={totalPages}
            swiperInstance={swiperInstance}
            onPageChange={setCurrentPage}
          />
        </div>
        <div className="absolute right-0 inset-y-0">
          <ComicSettingsPopover
            pageOption={pageOption}
            mode={mode}
            onChangeControllerVisible={changeControllerVisible}
            onChangeControllerDisabled={changeControllerDisabled}
            onChangeModeStatic={changeModeStatic}
          />
        </div>
      </div>
    </div>
  )
}
