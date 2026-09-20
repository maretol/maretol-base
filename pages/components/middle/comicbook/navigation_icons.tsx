import { memo } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageOption, PageTurnOptions } from './types'

type PageTurnAction = (options?: PageTurnOptions) => void

type NavigationIconsProps = {
  pageOption: PageOption
  zoneFlag: 'next' | 'prev' | 'none'
  onNextPage: PageTurnAction
  onPrevPage: PageTurnAction
}

function NavigationIcons(props: NavigationIconsProps) {
  const { pageOption, zoneFlag, onNextPage, onPrevPage } = props

  if (pageOption.controller_disabled) return null

  // 親のcomic-zoneにもクリック位置によるページ送り（useZoneDetection）があり、
  // ボタンは必ずそのゾーン内に置かれるため、バブリングさせると同じ方向へ2回ページ送りされてしまう
  const handleClick = (e: React.MouseEvent, action: PageTurnAction) => {
    e.stopPropagation()
    action()
  }

  // Enter/Spaceの押しっぱなしはリピートとして受け手に伝える
  // （通常のページ送りは従来どおり連続して進み、末尾の案内スライドでは案内を見る前に次の話へ遷移しないよう無視される）
  const handleKeyDown = (e: React.KeyboardEvent, action: PageTurnAction) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action({ repeat: e.repeat })
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="次のページへ"
        className={cn(
          'text-white h-20 w-20 cursor-pointer mix-blend-difference',
          // swiper-wrapperがz-index: 1を持つため、ページ画像より手前に出すにはそれより上げる必要がある
          'absolute z-10 left-0 top-1/2 flex justify-center items-center opacity-30',
          pageOption.controller_visible && 'opacity-100',
          zoneFlag === 'next' && 'opacity-100',
        )}
        onClick={(e) => handleClick(e, onNextPage)}
        onKeyDown={(e) => handleKeyDown(e, onNextPage)}
      >
        <ChevronLeftIcon className="h-full w-full" aria-hidden="true" />
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label="前のページへ"
        className={cn(
          'text-white h-20 w-20 cursor-pointer mix-blend-difference',
          'absolute z-10 right-0 top-1/2 flex justify-center items-center opacity-30',
          pageOption.controller_visible && 'opacity-100',
          zoneFlag === 'prev' && 'opacity-100',
        )}
        onClick={(e) => handleClick(e, onPrevPage)}
        onKeyDown={(e) => handleKeyDown(e, onPrevPage)}
      >
        <ChevronRightIcon className="h-full w-full" aria-hidden="true" />
      </div>
    </div>
  )
}

export default memo(NavigationIcons)
