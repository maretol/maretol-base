'use client'

import ClientImage2 from '@/components/small/client_image2'
import ShareButton from '@/components/small/share'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { ExternalLinkIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

type DrawerProps = {
  imageSrc: string
  shareURL: string
  title: string
  publishedAt: string
  children?: React.ReactNode
}

export default function DrawerPage({ imageSrc, shareURL, title, publishedAt, children }: DrawerProps) {
  const router = useRouter()
  const shareTitle = `Illustration: ${title}`
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
    const originTitle = document.title
    document.title = `Illustration: ${title} | Maretol Base`
    onOpen()
    return () => {
      document.title = originTitle
    }
  }, [onOpen, title])

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen} onAnimationEnd={onClose}>
      <DrawerContent className="w-full bg-gray-100">
        <div className="overflow-auto">
          <div className="absolute right-0 top-0">
            <DrawerClose asChild className="cursor-pointer">
              <Button variant="ghost" className="p-2 w-12 h-12">
                <XIcon className={'stroke-2'} />
              </Button>
            </DrawerClose>
          </div>
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
                <ExternalLinkIcon />
                Open in new tab
              </Link>
            </Button>
            <div className="flex items-center gap-2 ">
              <ShareButton variant="twitter" url={shareURL} title={shareTitle} />
              <ShareButton variant="bluesky" url={shareURL} title={shareTitle} />
              <ShareButton variant="copy_and_paste" url={shareURL} title={shareTitle} />
            </div>
          </div>
          <div className="mx-4">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="font-bold text-3xl">{title}</DrawerTitle>
            </DrawerHeader>
            <DrawerDescription className="px-4 py-0 text-right">Published at : {publishedAt}</DrawerDescription>
            <div>{children}</div>
          </div>
          <DrawerFooter className="w-full flex flex-col items-center justify-center gap-2 mx-auto mt-4">
            <DrawerClose asChild>
              <Button variant="secondary" className="w-1/2 cursor-pointer flex justify-center gap-2 font-bold">
                <XIcon className="w-4 h-4" />
                Close
              </Button>
            </DrawerClose>
            <p>Drawn by Maretol. © {publishedAt.substring(0, 4)} Maretol</p>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
