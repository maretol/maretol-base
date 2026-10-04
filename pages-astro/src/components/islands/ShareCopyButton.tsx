import { useState } from 'react'
import { CheckIcon, Copy } from 'lucide-react'
import { addUtmParams, type ContentType } from '@/lib/utm'

// タイトルと URL をクリップボードへコピーするボタン。
// class はサーバー側で組み立てて渡す（tailwind-merge などをクライアントへ持ち込まないため）
export default function ShareCopyButton({
  url,
  title,
  contentType = 'page',
  className,
}: {
  url: string
  title: string
  contentType?: ContentType
  className?: string
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
    <button type="button" className={className} onClick={onClick} aria-label="タイトルと URL をコピー">
      {!clicked && <Copy size={24} />}
      {clicked && <CheckIcon size={24} />}
    </button>
  )
}
