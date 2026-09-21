'use client'

import { useLinkStatus } from 'next/link'
import { createPortal } from 'react-dom'

// ページ遷移中に画面上部へ出す横向きのインジケーター（issue #1284）
// Link の中に position: fixed で置くと、祖先に transform がある場所（Swiper のスライド内など）で画面基準にならないため body へ portal する
// 一瞬で終わる遷移でちらつかないよう、表示の遅延は CSS（globals.css の .navigation-progress）側で持つ
export function NavigationProgressBar({ pending }: { pending: boolean }) {
  // pending はサーバーとハイドレーション時は常に false なので、document を触るのはクライアントの遷移中だけ
  if (!pending) return null
  return createPortal(
    <div className="navigation-progress" aria-hidden="true">
      <div className="navigation-progress-bar" />
    </div>,
    document.body
  )
}

// useLinkStatus は Link の子孫でしか使えないため、Link の children に置く
export function LinkPendingIndicator() {
  const { pending } = useLinkStatus()
  return <NavigationProgressBar pending={pending} />
}
