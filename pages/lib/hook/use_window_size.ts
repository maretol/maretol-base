'use client'

import { useLayoutEffect, useState } from 'react'

export default function useWindowSize() {
  const [windowSize, setWindowSize] = useState<[number, number]>([0, 0])
  useLayoutEffect(() => {
    const updateSize = () => {
      setWindowSize([window.innerWidth, window.innerHeight])
    }

    window.addEventListener('resize', updateSize)
    updateSize()

    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return windowSize
}
