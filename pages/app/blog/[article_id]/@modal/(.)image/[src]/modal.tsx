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
      <DialogContent className="w-max h-max m-0 p-0">
        <DialogTitle></DialogTitle>
        <DialogDescription></DialogDescription>
        <div className="flex justify-center items-center p-0 m-0 overflow-hidden">
          <ClientImage
            src={imageSrc}
            alt=""
            width={1000}
            height={1000}
            className="mb-5 mt-0 w-full max-w-fit h-full max-h-fit shadow-lg"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
