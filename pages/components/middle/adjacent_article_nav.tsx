import Link from 'next/link'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { adjacentContentsResult } from 'api-types'
import { Button } from '../ui/button'

// 記事下部の前後記事ナビ。prev = 一つ前（古い方）、next = 一つあと（新しい方）
export default function AdjacentArticleNav({ adjacent }: { adjacent: adjacentContentsResult }) {
  const { prev, next } = adjacent
  if (prev === null && next === null) {
    return null
  }
  return (
    <nav className="mb-4 flex justify-between gap-4" aria-label="前後の記事">
      <div className="flex-1 min-w-0">
        {prev && (
          <Button variant="secondary" className="w-full h-auto justify-start gap-2 py-3" asChild>
            <Link href={`/blog/${prev.id}`}>
              <ChevronLeftIcon className="w-5 h-5 shrink-0" />
              <span className="min-w-0 text-left">
                <span className="block text-xs text-gray-500">Prev article</span>
                <span className="block truncate">{prev.title}</span>
              </span>
            </Link>
          </Button>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {next && (
          <Button variant="secondary" className="w-full h-auto justify-end gap-2 py-3" asChild>
            <Link href={`/blog/${next.id}`}>
              <span className="min-w-0 text-right">
                <span className="block text-xs text-gray-500">Next article</span>
                <span className="block truncate">{next.title}</span>
              </span>
              <ChevronRightIcon className="w-5 h-5 shrink-0" />
            </Link>
          </Button>
        )}
      </div>
    </nav>
  )
}
