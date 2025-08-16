'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ImageRedirectPage({
  articleID,
  imageSrcBase64,
}: {
  articleID: string
  imageSrcBase64: string
}) {
  const router = useRouter()

  useEffect(() => {
    // クライアントサイドで画像のURLにリダイレクトする
    const target = `/blog/${articleID}#${imageSrcBase64}`
    router.replace(target)
  }, [router, articleID, imageSrcBase64])

  return <></>
}
