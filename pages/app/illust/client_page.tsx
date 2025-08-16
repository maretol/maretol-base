'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function ClientIllustPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const illustID = searchParams.get('illust_id')
  const draftKey = searchParams.get('draftKey') || undefined

  useEffect(() => {
    if (!illustID) return
    // クライアントサイドで /illust にリダイレクトする
    // metadataの都合、http redirectで転送はしない
    const target = `/illust/detail/${illustID}` + (draftKey ? `?draftKey=${draftKey}` : '')

    // history の /illust?illust_id=... を /illust に置換する
    window.history.replaceState(null, '', '/illust')

    router.push(target)
  }, [illustID, router, draftKey])

  return <></>
}
