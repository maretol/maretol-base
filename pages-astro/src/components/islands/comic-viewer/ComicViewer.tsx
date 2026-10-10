import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Swiper, SwiperSlide, type SwiperClass } from 'swiper/react'
import { Keyboard } from 'swiper/modules'
import { clsx } from 'clsx'
import { COMIC_MODE_THRESHOLD, COMIC_SCROLL_SPEED, comicPath } from '@/lib/comic'
import ComicSlide from './ComicSlide'
import NavigationIcons from './NavigationIcons'
import PageController from './PageController'
import SettingsPopover from './SettingsPopover'
import { appendSeriesGuide, createPageList, getLoadableIDs, toSinglePageList } from './pages'
import { getServerSettings, getSettings, subscribeSettings, updateSettings } from './settings'
import type { ComicViewerData, PageTurnOptions, SeriesGuide, ViewMode } from './types'
import 'swiper/css'

// 漫画のビューワ（現行サイトの pages/components/middle/comicbook を移植）
// 右綴じ（dir=rtl）の Swiper で、画面の幅に応じて見開き・単ページを切り替える。
// ページ送りはスワイプ・キーボード・左右のボタン・画面の左右 1/3 のクリックで行い、シリーズ作品は末尾に次の話への案内を出す。
// 設定は localStorage に保存する。画像は表示中のページから順に読み込む（順次先読み。pages.ts の getLoadableIDs）

// dir=rtl の Swiper で「次のページ」方向にあたるキー（Keyboard モジュールの RTL 時の判定と同じ）
const NEXT_PAGE_KEYS = ['ArrowLeft', 'PageUp']
// 末尾の案内スライド上で「次へ」方向にこの距離（px）以上スワイプしたら次の話へ遷移する（小さなぶれでは遷移しない）
const NEXT_EPISODE_SWIPE_THRESHOLD = 50
// マウス位置によるページ送りのゾーン（左から 1/3 が次、右から 1/3 が前）
const ZONE_NEXT = 1 / 3
const ZONE_PREV = 2 / 3

const wideQuery = `(min-width: ${COMIC_MODE_THRESHOLD}px)`

function subscribeWide(onChange: () => void): () => void {
  const mediaQuery = matchMedia(wideQuery)
  mediaQuery.addEventListener('change', onChange)
  return () => mediaQuery.removeEventListener('change', onChange)
}

function isWide(): boolean {
  return matchMedia(wideQuery).matches
}

// Swiper の Keyboard モジュールの onlyInViewport 相当。ビューワの一部でもウィンドウ内に見えていればキー操作を受け付ける
function isInViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth
}

type Zone = 'next' | 'prev' | 'none'

function zoneAt(el: HTMLElement | null, clientX: number): Zone {
  const width = el?.clientWidth
  if (!width) {
    return 'none'
  }
  return clientX < width * ZONE_NEXT ? 'next' : clientX > width * ZONE_PREV ? 'prev' : 'none'
}

type Props = { comic: ComicViewerData }

export default function ComicViewer({ comic }: Props) {
  const settings = useSyncExternalStore(subscribeSettings, getSettings, getServerSettings)
  const wide = useSyncExternalStore(subscribeWide, isWide, () => false)

  // モード固定（settings.mode_static）は、固定にした時点のモードを保ち、画面の幅が変わっても追従しない。
  // 固定のまま読み込み直したときは、そのときの幅のモードで固定し直す（現行サイトと同じ）
  const widthMode: ViewMode = wide ? 'double' : 'single'
  const [fixedMode, setFixedMode] = useState<ViewMode | null>(null)
  if (settings.mode_static && fixedMode === null) {
    setFixedMode(widthMode)
  }
  if (!settings.mode_static && fixedMode !== null) {
    setFixedMode(null)
  }
  const mode: ViewMode = settings.mode_static ? (fixedMode ?? widthMode) : widthMode
  const perView = mode === 'double' ? 2 : 1

  // 本編のスライドリスト（表紙・本文・裏表紙と見開き整列用の空白）
  const bookPageList = useMemo(() => createPageList(comic), [comic])
  const singleBookPageList = useMemo(() => toSinglePageList(bookPageList), [bookPageList])
  // シリーズ作品のときだけ末尾に案内スライドを出す
  const seriesGuide = useMemo<SeriesGuide | null>(
    () => (comic.seriesID === null ? null : { seriesID: comic.seriesID, nextID: comic.nextID }),
    [comic.seriesID, comic.nextID],
  )
  const displayBookPageList = mode === 'double' ? bookPageList : singleBookPageList
  // 実際に表示するスライドリスト。シリーズ作品では本編の末尾に案内スライドが付く
  const displayPageList = useMemo(
    () => appendSeriesGuide(displayBookPageList, seriesGuide, mode),
    [displayBookPageList, seriesGuide, mode],
  )
  // ページカウンター・スライダーは本編だけを対象にする（末尾の案内スライドは数えない）
  const totalPages = displayBookPageList.length

  const [currentPage, setCurrentPage] = useState(0)
  const [swiper, setSwiper] = useState<SwiperClass | null>(null)
  const [zone, setZone] = useState<Zone>('none')
  const zoneRef = useRef<HTMLDivElement>(null)

  // 読み込みが終わった（成功か、取り直しても失敗した）スライド。表示中のページから順に読み込むための判定に使う
  const [settled, setSettled] = useState<ReadonlySet<string>>(() => new Set())
  const onSettle = useCallback((id: string) => {
    setSettled((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  }, [])
  const loadable = getLoadableIDs(displayPageList, currentPage, perView, settled)

  // 表示中ページの論理 ID。モード切替でスライドリストが差し替わったときの位置復元に使う
  // 差し替え直後は currentPage が旧リストの index のままなので、復元（下の useLayoutEffect）より後に更新されるよう通常の useEffect で持つ
  const currentPageIDRef = useRef<string | null>(null)
  useEffect(() => {
    currentPageIDRef.current = displayPageList[currentPage]?.id ?? currentPageIDRef.current
  }, [currentPage, displayPageList])

  // モード切替でリストが差し替わると activeIndex が別のページを指してしまうため、同じページ ID の位置へ即時移動して復元する
  // モードが実際に変わったときだけ動かす（それ以外のレンダーで動くと通常のページ送りと競合する）
  const prevModeRef = useRef(mode)
  useLayoutEffect(() => {
    if (prevModeRef.current === mode) return
    if (!swiper || swiper.destroyed) return
    prevModeRef.current = mode
    const pageID = currentPageIDRef.current
    if (pageID === null) return

    let index = displayPageList.findIndex((page) => page.id === pageID)
    if (index < 0) {
      // single モードで除外される空白スライド（先頭・末尾・案内スライドの対）にいた場合は最寄りの端ページへ
      index = bookPageList[0]?.id === pageID ? 0 : displayPageList.length - 1
    }
    if (mode === 'double') {
      // 見開きの先頭（偶数 index）に揃える
      index -= index % 2
    }
    if (index !== swiper.activeIndex) {
      swiper.slideTo(index, 0)
    }
  }, [mode, swiper, displayPageList, bookPageList])

  // 末尾の案内スライドを表示し切っているか。操作のたびに Swiper の状態から導出する（state に写すとイベントの発火順に依存する）
  // isEnd は translate 由来のため、案内への遷移中にドラッグして中途半端な位置で止まった状態では偽になる
  const isGuideShown = useCallback(
    (instance: SwiperClass) =>
      !instance.animating && instance.isEnd && displayPageList[instance.activeIndex]?.kind === 'guide',
    [displayPageList],
  )

  // 「次へ」操作。案内スライドの表示中なら次の話へ遷移し、それ以外はページを送る
  // 案内に到達するスライド遷移の間は遷移しないため、その間の連打は案内の表示で止まる。遷移完了後の操作は遷移する
  // repeat（キー押しっぱなしのリピート）は、案内を見る前に次の話へ遷移してしまわないよう案内スライド上では無視する
  const handleNextPage = useCallback(
    (options?: PageTurnOptions) => {
      if (!swiper) return
      if (isGuideShown(swiper)) {
        if (comic.nextID !== null && !options?.repeat) {
          location.assign(comicPath(comic.nextID))
        }
        return
      }
      swiper.slideNext(COMIC_SCROLL_SPEED)
    },
    [swiper, isGuideShown, comic.nextID],
  )

  const handlePrevPage = useCallback(() => {
    swiper?.slidePrev(COMIC_SCROLL_SPEED)
  }, [swiper])

  // キーボードのページ送りは Swiper の Keyboard モジュールが document で処理しており、末尾では何も起きない
  // 案内スライドの表示中に「次へ」方向のキーが押されたときだけここで拾い、他の操作と同じ handleNextPage に寄せる
  // Keyboard モジュールと同じ条件で無視する: 無効化中（スライダー操作中）・修飾キー付き・入力要素へのキー・ビューワが画面外
  useEffect(() => {
    if (!swiper || comic.nextID === null) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!NEXT_PAGE_KEYS.includes(e.key) || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return
      if (!swiper.keyboard.enabled || !isGuideShown(swiper)) return
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]')) return
      if (!isInViewport(swiper.el)) return
      handleNextPage({ repeat: e.repeat })
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [swiper, comic.nextID, isGuideShown, handleNextPage])

  return (
    <div className="h-[95svh] w-full bg-gray-700" tabIndex={0}>
      <div
        ref={zoneRef}
        className="text-white h-full max-h-[96%] w-full relative comic-zone"
        onClick={(e) => {
          const clicked = zoneAt(zoneRef.current, e.clientX)
          if (clicked === 'next') handleNextPage()
          if (clicked === 'prev') handlePrevPage()
        }}
        onMouseMove={(e) => setZone(zoneAt(zoneRef.current, e.clientX))}
        onMouseLeave={() => setZone('none')}
      >
        <Swiper
          modules={[Keyboard]}
          dir="rtl"
          speed={COMIC_SCROLL_SPEED}
          slidesPerView={perView}
          slidesPerGroup={perView}
          onSwiper={setSwiper}
          onActiveIndexChange={(instance) => setCurrentPage(instance.activeIndex)}
          // 案内スライド上で「次へ」方向にスワイプしたときも次の話へ遷移する（末尾では Swiper はラバーバンドで戻すだけのため）
          // swipeDirection はタッチ開始でリセットされ、動きがあったときだけ入る。本編のスライドでは何もしない（Swiper 側がページを送る）
          onTouchEnd={(instance) => {
            if (!isGuideShown(instance) || instance.swipeDirection !== 'next') return
            if (Math.abs(instance.touches.diff) >= NEXT_EPISODE_SWIPE_THRESHOLD) handleNextPage()
          }}
          keyboard={{ enabled: true }}
          className="h-full w-full"
        >
          {displayPageList.map((page) => (
            <SwiperSlide key={page.id}>
              {({ isActive }) => (
                <ComicSlide
                  mode={mode}
                  page={page}
                  isActive={isActive}
                  loadable={loadable.has(page.id) || settled.has(page.id)}
                  onSettle={onSettle}
                />
              )}
            </SwiperSlide>
          ))}
          <NavigationIcons settings={settings} zone={zone} onNextPage={handleNextPage} onPrevPage={handlePrevPage} />
        </Swiper>
      </div>
      <div
        className={clsx('relative bg-gray-700 h-[4%] w-full text-white text-center flex justify-center items-center')}
      >
        <div className="flex justify-center items-center w-[90%]">
          <PageController
            mode={mode}
            currentPage={currentPage}
            totalPages={totalPages}
            swiper={swiper}
            onPageChange={setCurrentPage}
          />
        </div>
        <div className="absolute right-0 inset-y-0">
          <SettingsPopover settings={settings} mode={mode} onChange={updateSettings} />
        </div>
      </div>
    </div>
  )
}
