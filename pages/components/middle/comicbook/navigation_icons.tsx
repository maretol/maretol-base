import { memo } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageOption } from './types'

type NavigationIconsProps = {
  pageOption: PageOption
  zoneFlag: 'next' | 'prev' | 'none'
  onNextPage: () => void
  onPrevPage: () => void
}

function NavigationIcons(props: NavigationIconsProps) {
  const { pageOption, zoneFlag, onNextPage, onPrevPage } = props

  if (pageOption.controller_disabled) return null

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action()
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="次のページへ"
        className={cn(
          'text-white h-20 w-20 cursor-pointer',
          'absolute left-0 top-1/2 flex justify-center items-center opacity-30',
          pageOption.controller_visible && 'opacity-100',
          zoneFlag === 'next' && 'opacity-100'
        )}
        onClick={onNextPage}
        onKeyDown={(e) => handleKeyDown(e, onNextPage)}
      >
        <ChevronLeftIcon className="h-full w-full" aria-hidden="true" />
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label="前のページへ"
        className={cn(
          'text-white h-20 w-20 cursor-pointer',
          'absolute right-0 top-1/2 flex justify-center items-center opacity-30',
          pageOption.controller_visible && 'opacity-100',
          zoneFlag === 'prev' && 'opacity-100'
        )}
        onClick={onPrevPage}
        onKeyDown={(e) => handleKeyDown(e, onPrevPage)}
      >
        <ChevronRightIcon className="h-full w-full" aria-hidden="true" />
      </div>
    </div>
  )
}

export default memo(NavigationIcons)
