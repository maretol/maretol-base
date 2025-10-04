import { useEffect, useState } from 'react'
import { comicModeThreshold } from '@/lib/static'

export function useViewMode(width: number, modeStatic: boolean) {
  const [mode, setMode] = useState<'single' | 'double'>('single')

  useEffect(() => {
    if (modeStatic) return

    const newMode = width < comicModeThreshold ? 'single' : 'double'
    if (mode !== newMode) {
      setMode(newMode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, modeStatic])

  return mode
}
