import { memo } from 'react'
import * as Slider from '@radix-ui/react-slider'
import type { SwiperClass } from 'swiper/react'
import type { ViewMode } from './types'

// スライダーの class は現行サイトの shadcn/ui の Slider と同じ（幅は single / double で変える）
const rootClassName = 'relative flex touch-none select-none items-center'
const trackClassName = 'relative h-2 w-full grow overflow-hidden rounded-full bg-secondary'
const rangeClassName = 'absolute h-full bg-blue-900 border-gray-300 border-2'
const thumbClassName =
  'block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

type Props = {
  mode: ViewMode
  currentPage: number
  totalPages: number
  swiper: SwiperClass | null
  onPageChange: (page: number) => void
}

function PageController({ mode, currentPage, totalPages, swiper, onPageChange }: Props) {
  // currentPage / totalPages はスライド単位のため、double モードでは見開き（2 スライド）単位に変換する
  const groupSize = mode === 'double' ? 2 : 1
  const totalGroups = Math.ceil(totalPages / groupSize)
  // totalPages は本編だけの数のため、末尾の案内スライド上では最終ページの表示のまま止める
  const currentGroup = Math.min(Math.floor(currentPage / groupSize), totalGroups - 1)

  return (
    // スライダー操作中の矢印キーが Swiper の Keyboard モジュールにも処理されて二重に進むのを防ぐ
    // （Swiper は document で keydown を監視するため stopPropagation では止められない）
    <div
      className="w-max flex justify-center items-center space-x-2"
      onFocus={() => swiper?.keyboard.disable()}
      onBlur={() => swiper?.keyboard.enable()}
    >
      <Slider.Root
        dir="rtl"
        min={0}
        max={totalGroups - 1}
        value={[currentGroup]}
        className={`${rootClassName} ${mode === 'single' ? 'w-72' : 'w-96'}`}
        onValueChange={([value]) => {
          const slideIndex = value * groupSize
          onPageChange(slideIndex)
          swiper?.slideTo(slideIndex)
        }}
      >
        <Slider.Track className={trackClassName}>
          <Slider.Range className={rangeClassName} />
        </Slider.Track>
        <Slider.Thumb className={thumbClassName} aria-label="ページ" />
      </Slider.Root>
      <p>
        Page: {currentGroup + 1}/{totalGroups}
      </p>
    </div>
  )
}

export default memo(PageController)
