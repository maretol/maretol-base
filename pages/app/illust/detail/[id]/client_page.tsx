'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ClientIllustPage({ illustID, draftKey }: { illustID: string; draftKey?: string }) {
  // クライアントサイドで /illust にリダイレクトする
  // metadataの都合、http redirectで転送はしない
  const router = useRouter()
  useEffect(() => {
    if (!illustID) return
    const query = new URLSearchParams()
    query.set('illust_id', illustID)
    if (draftKey) {
      query.set('draftKey', draftKey)
    }
    const queryString = query.toString()
    const target = `/illust?${queryString}`
    router.replace(target)
  }, [router, illustID, draftKey])

  return <div></div>
}
