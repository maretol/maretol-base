'use client'

import ClientImage from '@/components/small/client_image'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export default function Modal({ imageSrc }: { imageSrc: string }) {
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
    <Dialog defaultOpen onOpenChange={onClose}>
      <DialogContent className="max-w-[96dvw] max-h-[96dvh] h-auto w-auto m-0 py-10 px-0 bg-blue-300 bg-opacity-30 border-0">
        <DialogTitle></DialogTitle>
        <DialogDescription></DialogDescription>
        <div className="p-2 w-max h-max">
          <ClientImage
            src={imageSrc}
            alt=""
            width={100}
            height={100}
            className="h-fit w-auto max-h-[95dvh] shadow-lg overflow-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
