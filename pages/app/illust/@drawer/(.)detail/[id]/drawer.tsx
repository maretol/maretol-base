'use client'

import ClientImage2 from '@/components/small/client_image2'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { ParsedContent } from 'api-types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

type DrawerProps = {
  imageSrc: string
  title: string
  description: ParsedContent[]
}

export default function DrawerPage({ imageSrc, title }: DrawerProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const onClose = useCallback(
    (open: boolean) => {
      if (!open) {
        router.back()
      }
    },
    [router]
  )
  const onOpen = useCallback(() => {
    setOpen(true)
  }, [])

  // ページ遷移後にDrawerを開く
  // defaultOpenではアニメーションが実行されないため
  useEffect(() => {
    onOpen()
  }, [onOpen])

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen} onAnimationEnd={onClose}>
      <DrawerContent className="w-full bg-gray-100">
        <div className="overflow-auto">
          <div className="w-full h-auto">
            <div className="w-full h-auto">
              <ClientImage2
                src={imageSrc}
                alt={title}
                width={0}
                height={0}
                quality={90}
                className="w-full h-full max-h-svh object-contain"
              />
            </div>
          </div>
          <div className="flex justify-between p-4">
            <Button variant={'outline'} asChild>
              <Link
                href={`https://www.maretol.xyz/cdn-cgi/image/f=auto,q=100/${imageSrc}`}
                target={'_blank'}
                className="flex items-center gap-2"
              >
                Open the image in new tab
              </Link>
            </Button>
            <DrawerClose asChild className="cursor-pointer">
              <Button>Close</Button>
            </DrawerClose>
          </div>
          <DrawerHeader>
            <DrawerTitle className="font-bold text-3xl">{title}</DrawerTitle>
          </DrawerHeader>
          <DrawerDescription className="p-4">This is a drawer page for illustration details.</DrawerDescription>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
