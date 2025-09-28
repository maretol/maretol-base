'use client'

import { ExternalLinkIcon, XIcon } from 'lucide-react'
import ClientImage2 from '../small/client_image2'
import { Button } from '../ui/button'
import { DrawerClose, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '../ui/drawer'
import ShareSection from '../middle/share_section'
import Link from 'next/link'

type IllustDrawerProps = {
  imageSrc: string
  title: string
  shareURL: string
  shareTitle: string
  publishedAt: string
  children?: React.ReactNode
}

export default function IllustDrawer({
  imageSrc,
  title,
  publishedAt,
  shareURL,
  shareTitle,
  children,
}: IllustDrawerProps) {
  return (
    <>
      <div className="w-full h-auto">
        <div className="w-full h-auto">
          <ClientImage2
            src={imageSrc}
            alt={title}
            width={0}
            height={0}
            quality={90}
            className="w-full h-full max-h-dvh object-contain"
          />
        </div>
      </div>
      <div className="flex justify-between p-4">
        <Button variant={'outline'} asChild className="font-suse">
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
          <ShareSection shareURL={shareURL} shareTitle={shareTitle} />
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
        <p className="font-suse">Drawn by Maretol. © {publishedAt.substring(0, 4)} Maretol</p>
      </DrawerFooter>
    </>
  )
}
