'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { parsePageParam } from '@/lib/pagination'

// 一覧で最後に見たページ番号をタブ単位（sessionStorage）で覚えておき、パンくずの戻り先に使う
const storageKey = (path: string) => `admin-list-page:${path}`

// 一覧ページに置く。表示中のページ番号を記録する
export function RememberListPage({ path, page }: { path: string; page: number }) {
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(path), String(page))
    } catch {
      // ストレージが使えない環境では覚えないだけ（パンくずは1ページ目へ戻る）
    }
  }, [path, page])
  return null
}

// sessionStorage は同一タブ内の変更を通知しないので購読はしない（再レンダーのたびに読み直される）
const subscribe = () => () => {}

// 記録がない・読めない・SSR 中は1ページ目
export function useRememberedListPage(path: string | null): number {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      if (path === null) {
        return null
      }
      try {
        return sessionStorage.getItem(storageKey(path))
      } catch {
        return null
      }
    },
    () => null
  )
  return parsePageParam(raw ?? undefined) ?? 1
}
