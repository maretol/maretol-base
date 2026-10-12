import type { ReactNode } from 'react'

type Props = {
  label: string
  url: string
  // URL の後ろに添える補足（有効期間など）
  note?: string
  // 枠の色。操作の結果は青、編集ページを開いたときに残っていた情報は灰
  tone?: 'blue' | 'gray'
  children?: ReactNode
}

const TONE = {
  blue: { box: 'border-blue-200 bg-blue-50 text-blue-700', note: 'text-blue-600' },
  gray: { box: 'border-gray-200 bg-gray-50 text-gray-700', note: 'text-gray-500' },
}

// URL を 1 行で知らせる枠（プレビュー URL・公開 URL）。新しいタブで開くリンクと補足を並べる
export function URLNotice({ label, url, note, tone = 'blue', children }: Props) {
  const classes = TONE[tone]
  return (
    <p className={`rounded-md border p-3 text-sm ${classes.box}`}>
      {label}:{' '}
      <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
        {url}
      </a>
      {note && <span className={`ml-2 text-xs ${classes.note}`}>{note}</span>}
      {children}
    </p>
  )
}
