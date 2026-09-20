import { memo } from 'react'
import { SwiperClass } from 'swiper/react'
import { Slider } from '@/components/ui/slider'

type PageControllerProps = {
  mode: 'single' | 'double'
  currentPage: number
  totalPages: number
  swiperInstance: SwiperClass | null
  onPageChange: (page: number) => void
}

function PageController(props: PageControllerProps) {
  const { mode, currentPage, totalPages, swiperInstance, onPageChange } = props

  // currentPage/totalPagesはスライド単位のため、doubleモードでは見開き（2スライド）単位に変換する
  const groupSize = mode === 'double' ? 2 : 1
  const totalGroups = Math.ceil(totalPages / groupSize)
  // totalPagesは本編だけの数のため、末尾の案内スライド上では最終ページの表示のまま止める
  const currentGroup = Math.min(Math.floor(currentPage / groupSize), totalGroups - 1)

  return (
    // スライダー操作中の矢印キーがSwiperのKeyboardモジュールにも処理されて二重に進むのを防ぐ
    // （Swiperはdocumentでkeydownを監視するためstopPropagationでは止められない）
    <div
      className="w-max flex justify-center items-center space-x-2"
      onFocus={() => swiperInstance?.keyboard.disable()}
      onBlur={() => swiperInstance?.keyboard.enable()}
    >
      <Slider
        dir="rtl"
        min={0}
        max={totalGroups - 1}
        value={[currentGroup]}
        className={mode === 'single' ? 'w-72' : 'w-96'}
        onValueChange={(value: number[]) => {
          const [v] = value
          const slideIndex = v * groupSize
          onPageChange(slideIndex)
          swiperInstance?.slideTo(slideIndex)
        }}
      />
      <p>
        Page: {currentGroup + 1}/{totalGroups}
      </p>
    </div>
  )
}

export default memo(PageController)
