import { memo } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageOption } from './types'

type NavigationIconsProps = {
  pageOption: PageOption
  zoneFlag: 'next' | 'prev' | 'none'
}

function NavigationIcons(props: NavigationIconsProps) {
  const { pageOption, zoneFlag } = props

  if (pageOption.controller_disabled) return null

  return (
    <div tabIndex={0}>
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
  )
}

export default memo(NavigationIcons)
