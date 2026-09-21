import Link from 'next/link'
import { ComponentProps } from 'react'
import { LinkPendingIndicator } from './navigation_progress'

// 遷移中のインジケーターを内包した Link（issue #1284）
// サイト内のページへ遷移するリンクはこちらを使う。外部リンクやページ内アンカーは遷移待ちが発生しないので next/link のままでよい
export default function AppLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props}>
      {children}
      <LinkPendingIndicator />
    </Link>
  )
}
