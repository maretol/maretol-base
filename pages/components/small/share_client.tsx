'use client'

import { CheckIcon, Copy } from 'lucide-react'
import { Button } from '../ui/button'
import { useState } from 'react'
import { addUtmParams, ContentType } from '@/lib/utm'

export default function ShareCopyAndPasteButton({
  url,
  title,
  contentType = 'page',
}: {
  url: string
  title: string
  contentType?: ContentType
}) {
  const urlWithUtm = addUtmParams(url, {
    source: 'clipboard',
    medium: 'social',
    campaign: 'share_button',
    content: contentType,
  })
  const text = `${title} | Maretol Base\n${urlWithUtm}`
  const [clicked, setClicked] = useState(false)
  const onClick = () => {
    navigator.clipboard.writeText(text)
    setClicked(true)
    setTimeout(() => {
      setClicked(false)
    }, 1000)
  }
  return (
    <Button variant="secondary" className="p-3 cursor-pointer" onClick={onClick}>
      {!clicked && <Copy size={24} />}
      {clicked && <CheckIcon size={24} />}
    </Button>
  )
}
