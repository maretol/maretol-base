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

  return (
    <div className="w-max flex justify-center items-center space-x-2">
      <Slider
        dir="rtl"
        min={0}
        max={totalPages - 1}
        value={[currentPage]}
        className={mode === 'single' ? 'w-72' : 'w-96'}
        onValueChange={(value: number[]) => {
          const [v] = value
          onPageChange(v)
          swiperInstance?.slideTo(v)
        }}
      />
      <p>
        Page: {currentPage + 1}/{totalPages}
      </p>
    </div>
  )
}

export default memo(PageController)
