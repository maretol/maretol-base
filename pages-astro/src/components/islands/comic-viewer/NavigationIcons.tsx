import { memo } from 'react'
import { clsx } from 'clsx'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type { PageTurnAction, ViewerSettings } from './types'

type Props = {
  settings: ViewerSettings
  zone: 'next' | 'prev' | 'none'
  onNextPage: PageTurnAction
  onPrevPage: PageTurnAction
}

function NavigationIcons({ settings, zone, onNextPage, onPrevPage }: Props) {
  if (settings.controller_disabled) {
    return null
  }

  // 親の comic-zone にもクリック位置によるページ送りがあり、ボタンは必ずそのゾーン内に置かれるため、
  // バブリングさせると同じ方向へ 2 回ページ送りされてしまう
  const handleClick = (e: React.MouseEvent, action: PageTurnAction) => {
    e.stopPropagation()
    action()
  }

  // Enter / Space の押しっぱなしはリピートとして受け手に伝える
  // （通常のページ送りは従来どおり連続して進み、末尾の案内スライドでは案内を見る前に次の話へ遷移しないよう無視される）
  const handleKeyDown = (e: React.KeyboardEvent, action: PageTurnAction) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action({ repeat: e.repeat })
    }
  }

  const iconClassName = (side: 'left' | 'right', highlighted: boolean) =>
    clsx(
      'text-white h-20 w-20 cursor-pointer mix-blend-difference',
      // swiper-wrapper が z-index: 1 を持つため、ページ画像より手前に出すにはそれより上げる必要がある
      'absolute z-10 top-1/2 flex justify-center items-center opacity-30',
      side === 'left' ? 'left-0' : 'right-0',
      (settings.controller_visible || highlighted) && 'opacity-100',
    )

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="次のページへ"
        className={iconClassName('left', zone === 'next')}
        onClick={(e) => handleClick(e, onNextPage)}
        onKeyDown={(e) => handleKeyDown(e, onNextPage)}
      >
        <ChevronLeftIcon className="h-full w-full" aria-hidden="true" />
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label="前のページへ"
        className={iconClassName('right', zone === 'prev')}
        onClick={(e) => handleClick(e, onPrevPage)}
        onKeyDown={(e) => handleKeyDown(e, onPrevPage)}
      >
        <ChevronRightIcon className="h-full w-full" aria-hidden="true" />
      </div>
    </div>
  )
}

export default memo(NavigationIcons)
