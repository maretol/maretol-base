'use client'

import IllustDrawer from '@/components/large/illust_drawer'
import { useEffect } from 'react'

type DrawerProps = {
  imageSrc: string
  shareURL: string
  title: string
  publishedAt: string
  children?: React.ReactNode
}

export default function DrawerPage({ imageSrc, shareURL, title, publishedAt, children }: DrawerProps) {
  const shareTitle = `Illustration: ${title}`

  // ページタイトルをtitleに合わせて変更
  useEffect(() => {
    document.title = `Illustration: ${title} | Maretol Base`
  }, [title])

  return (
    <IllustDrawer
      imageSrc={imageSrc}
      title={title}
      publishedAt={publishedAt}
      shareURL={shareURL}
      shareTitle={shareTitle}
    >
      {children}
    </IllustDrawer>
  )
}
