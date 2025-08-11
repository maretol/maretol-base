'use client'

import { Drawer, DrawerContent, DrawerClose, DrawerTitle, DrawerDescription } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { XIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

export default function DrawerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(true)

  const onClose = useCallback(
    (open: boolean) => {
      if (!open) {
        router.back()
      }
    },
    [router]
  )

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen} onAnimationEnd={onClose}>
      <DrawerTitle className="hidden">Illustration Title</DrawerTitle>
      <DrawerContent className="w-full bg-gray-100">
        <div className="overflow-auto">
          <div className="absolute right-0 top-0 z-10">
            <DrawerClose asChild className="cursor-pointer">
              <Button variant="ghost" className="p-2 w-12 h-12">
                <XIcon className={'stroke-2'} />
              </Button>
            </DrawerClose>
          </div>
          {children}
        </div>
        <DrawerDescription className="hidden">Illustration Description</DrawerDescription>
      </DrawerContent>
    </Drawer>
  )
}
