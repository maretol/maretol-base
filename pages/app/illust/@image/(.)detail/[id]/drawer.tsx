'use client'

import ClientImage from '@/components/small/client_image'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { ParsedContent } from 'api-types'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

type DrawerProps = {
  imageSrc: string
  title: string
  description: ParsedContent[]
}

export default function DrawerPage({ imageSrc, title }: DrawerProps) {
  const router = useRouter()
  const onClose = useCallback(
    (open: boolean) => {
      if (!open) {
        router.back()
      }
    },
    [router]
  )

  return (
    <Drawer defaultOpen onOpenChange={onClose} direction="right">
      <DrawerContent className="">
        <DrawerHeader>
          <DrawerTitle>Title: {title}</DrawerTitle>
        </DrawerHeader>
        <DrawerDescription>
          <div className="p-2 w-max h-max">src: {imageSrc}</div>
          <div>
            <p>test message</p>
          </div>
        </DrawerDescription>
      </DrawerContent>
    </Drawer>
  )
}
