'use client'

import { CheckIcon, Copy } from 'lucide-react'
import { Button } from '../ui/button'
import { useState } from 'react'

export default function ShareCopyAndPasteButton({ url, title }: { url: string; title: string }) {
  const text = `${title} | Maretol Base\n${url}`
  const [clicked, setClicked] = useState(false)
  const onClick = () => {
    navigator.clipboard.writeText(text)
    setClicked(true)
    setTimeout(() => {
      setClicked(false)
    }, 1000)
  }
  return (
    <Button variant="secondary" className="p-3" onClick={onClick}>
      {!clicked && <Copy size={24} />}
      {clicked && <CheckIcon size={24} />}
    </Button>
  )
}
