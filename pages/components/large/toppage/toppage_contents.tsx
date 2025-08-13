'use client'

import { cn } from '@/lib/utils'
import { Button } from '../../ui/button'
import Link from 'next/link'
import { RefObject, useCallback, useRef } from 'react'
import { ChevronLeftIcon, ChevronRight } from 'lucide-react'

export default function TopPageContentsViewer({
  moreLink,
  moreButtonText,
  children,
}: {
  moreLink: string
  moreButtonText: string
  children: React.ReactNode
}) {
  const viewerRef = useRef<HTMLDivElement>(null)

  const scrollRight = useCallback((ref: RefObject<HTMLDivElement | null>) => {
    if (!ref || !ref.current) return
    ref.current?.scrollBy({ left: 10, behavior: 'smooth' })
  }, [])

  const scrollLeft = useCallback((ref: RefObject<HTMLDivElement | null>) => {
    if (!ref || !ref.current) return
    ref.current?.scrollBy({ left: -10, behavior: 'smooth' })
  }, [])

  return (
    <div className="relative">
      <div className="absolute left-0 top-0 h-full max-md:hidden">
        <Button
          variant="default"
          className="mb-4 h-full bg-white/10 stroke-gray-700 hover:stroke-gray-50 cursor-pointer"
          onClick={() => scrollLeft(viewerRef)}
        >
          <ChevronLeftIcon className="w-12 h-12" />
        </Button>
      </div>
      <div className={cn('snap-x snap-mandatory', 'flex gap-8 md:gap-20 overflow-x-auto ')} ref={viewerRef}>
        {children}
        <div className={cn('md:snap-start snap-center snap-always', 'w-48 mb-4 mr-48', 'flex-none')}>
          <div className="h-full flex items-center justify-center">
            <Button asChild variant="outline" className="h-full w-full bg-gray-100 hover:bg-white">
              <Link href={moreLink}>{moreButtonText}</Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="absolute right-0 top-0 h-full max-md:hidden">
        <Button
          variant="default"
          className="mb-4 h-full bg-white/10 stroke-gray-700 hover:stroke-gray-50 cursor-pointer"
          onClick={() => scrollRight(viewerRef)}
        >
          <ChevronRight className="w-12 h-12" />
        </Button>
      </div>
    </div>
  )
}
