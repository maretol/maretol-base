'use client'

import { cn } from '@/lib/utils'
import { Button } from '../../ui/button'
import Link from 'next/link'
import { useRef } from 'react'
import { ChevronLeftIcon } from 'lucide-react'

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

  return (
    <div className={cn('snap-x snap-mandatory', 'flex gap-20 overflow-x-auto', 'relative')} ref={viewerRef}>
      {children}
      <div className={cn('md:snap-start snap-center snap-always', 'w-48 mb-4', 'flex-none')}>
        <div className="h-full flex items-center justify-center">
          <Button asChild variant="outline" className="h-full w-full bg-gray-100 hover:bg-white">
            <Link href={moreLink}>{moreButtonText}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
