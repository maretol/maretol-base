'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SEGMENT_LABELS: Record<string, string> = {
  illust: 'イラスト',
  comic: 'マンガ',
  blog: 'ブログ',
  cache: 'キャッシュ管理',
  new: '新規作成',
  edit: '編集',
  tags: 'タグ管理',
  series: 'シリーズ管理',
  categories: 'カテゴリ管理',
  info: '固定ページ',
  static: '静的文言',
}

// 一覧ページとして遷移可能なパス。中間セグメントはここに含まれるときだけリンクにする
// （/blog/{id} のようなページは存在しないため、コンテンツIDはリンクにしない）
const LINKABLE_PATHS = new Set(['/illust', '/comic', '/blog', '/blog/info'])

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) {
    return null
  }

  const items = segments.map((segment, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/')
    const label = SEGMENT_LABELS[segment]
    const isLast = i === segments.length - 1
    return { href, segment, label, isLast }
  })

  return (
    <nav aria-label="パンくずリスト" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-gray-500">
      <Link href="/" className="hover:text-gray-900 hover:underline">
        ホーム
      </Link>
      {items.map((item) => (
        <span key={item.href} className="flex items-center gap-1">
          <span aria-hidden="true">/</span>
          {!item.isLast && LINKABLE_PATHS.has(item.href) ? (
            <Link href={item.href} className="hover:text-gray-900 hover:underline">
              {item.label ?? item.segment}
            </Link>
          ) : item.label ? (
            <span className={item.isLast ? 'font-medium text-gray-900' : undefined}>{item.label}</span>
          ) : (
            // ラベル未定義のセグメントはコンテンツID（動的セグメント）
            <span className="font-mono text-xs">{item.segment}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
