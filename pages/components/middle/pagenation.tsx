import Link from 'next/link'
import { Button } from '../ui/button'
import { getPageHref, getPageItems, getPageSlots, PageItem } from '@/lib/pagenation'
import { cn } from '@/lib/utils'

// 現在のページの前後に表示する件数。狭い画面は最大7枠、sm 以上は最大9枠に収める
const SIBLING_COUNT_NARROW = 1
const SIBLING_COUNT_WIDE = 2

export default function Pagenation({
  path,
  queryWithoutPage,
  currentPage,
  totalPage,
}: {
  path: string
  queryWithoutPage?: { [key: string]: string } | undefined
  currentPage: number
  totalPage: number
}) {
  const query = queryWithoutPage ?? {}

  const renderItems = (items: PageItem[], className?: string) => (
    <div className={cn('flex gap-1 sm:gap-2', className)}>
      {items.map((item) => {
        if (typeof item !== 'number') {
          return (
            <span key={item} className="w-10 h-10 flex items-end justify-center pb-2 select-none" aria-hidden="true">
              …
            </span>
          )
        }
        return (
          <Button key={item} variant={currentPage === item ? 'default' : 'secondary'} className="p-2 w-10" asChild>
            <Link href={getPageHref(path, query, item)} aria-current={currentPage === item ? 'page' : undefined}>
              {item}
            </Link>
          </Button>
        )
      })}
    </div>
  )

  // 狭い画面でも省略が要らないページ数なら出し分けは不要
  if (totalPage <= getPageSlots(SIBLING_COUNT_NARROW)) {
    return renderItems(getPageItems(currentPage, totalPage, SIBLING_COUNT_NARROW))
  }
  return (
    <>
      {renderItems(getPageItems(currentPage, totalPage, SIBLING_COUNT_NARROW), 'sm:hidden')}
      {renderItems(getPageItems(currentPage, totalPage, SIBLING_COUNT_WIDE), 'hidden sm:flex')}
    </>
  )
}
