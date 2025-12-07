'use client'

import ClientImage2 from '@/components/small/client_image2'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import Image from 'next/image'

export default function Modal({ imageSrc, imageData }: { imageSrc: string; imageData?: string | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        router.back()
      }
      setOpen(open)
    },
    [router]
  )

  const handleClose = useCallback(() => {
    router.back()
  }, [router])

  // 外部画像（http/https始まりかつ自サイトでない）かどうか判定
  const isExternalImage =
    imageSrc.startsWith('http') && !imageSrc.includes('maretol.xyz') && !imageSrc.includes('r2.maretol.xyz')

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal>
      <DialogContent className="h-full w-full m-0 p-0 border-0 bg-transparent">
        <DialogTitle className="sr-only">画像</DialogTitle>
        <DialogDescription className="sr-only">画像を表示しています</DialogDescription>
        <div
          className="relative w-full h-full flex items-center justify-center p-2"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleClose()
            }
          }}
        >
          {isExternalImage && imageData ? (
            <Image
              src={imageData}
              alt=""
              width={3000}
              height={3000}
              unoptimized
              className="object-contain w-auto h-auto max-w-full max-h-full"
            />
          ) : (
            <ClientImage2
              src={imageSrc}
              alt=""
              width={3000}
              height={3000}
              className="object-contain w-auto h-auto max-w-full max-h-full"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
