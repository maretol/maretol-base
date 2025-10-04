import { RefObject, useCallback, useState } from 'react'
import { ZONE_RATIO } from '@/components/middle/comicbook/constants'

type ZoneFlag = 'next' | 'prev' | 'none'

function calculateZone(divElement: HTMLDivElement | null, clientX: number): ZoneFlag {
  if (!divElement) return 'none'

  const comicWidth = divElement.clientWidth
  if (!comicWidth) return 'none'

  const nextZone = comicWidth * ZONE_RATIO.NEXT
  const prevZone = comicWidth * ZONE_RATIO.PREV

  if (clientX < nextZone) {
    return 'next'
  } else if (clientX > prevZone) {
    return 'prev'
  } else {
    return 'none'
  }
}

export function useZoneDetection(divRef: RefObject<HTMLDivElement | null>) {
  const [zoneFlag, setZoneFlag] = useState<ZoneFlag>('none')

  // NOTE: refオブジェクトは依存配列に含めない
  // ref自体は不変で、.currentの値だけが変わるため、依存配列に含める必要がない
  // React 19以降では useEffectEvent を使用してより明示的に書ける
  const mouseMoveEvent = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const zone = calculateZone(divRef.current, e.clientX)
      setZoneFlag(zone)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const mouseClickEvent = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, leftClick: () => void, rightClick: () => void) => {
      const zone = calculateZone(divRef.current, e.clientX)
      if (zone === 'next') {
        leftClick()
      } else if (zone === 'prev') {
        rightClick()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const mouseLeaveEvent = useCallback(() => {
    setZoneFlag('none')
  }, [])

  return {
    zoneFlag,
    mouseMoveEvent,
    mouseClickEvent,
    mouseLeaveEvent,
  }
}
