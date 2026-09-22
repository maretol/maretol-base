'use client'

import ClientImage2 from '@/components/small/client_image2'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import Image from 'next/image'
import { getNoImageURL } from '@/lib/image'

// isExternalImage: 引用画像（外部サイトの画像）。サーバー側で取得した imageData（data URL）を表示する
// 自サイトの画像はクライアント側で画像変換を通して表示する
export default function Modal({
  imageSrc,
  imageData,
  isExternalImage,
}: {
  imageSrc: string
  imageData?: string | null
  isExternalImage: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        router.back()
      }
      setOpen(open)
    },
    [router],
  )

  const handleClose = useCallback(() => {
    router.back()
  }, [router])

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
          {isExternalImage ? (
            <Image
              // 取得に失敗していたらフォールバック画像を出す
              src={imageData || getNoImageURL()}
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
