import Link from 'next/link'
import { Button } from '../ui/button'
import { getPageItems, PageItem } from '@/lib/pagenation'
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
  queryWithoutPage?: { [key: string]: string | string[] } | undefined
  currentPage: number
  totalPage: number
}) {
  if (queryWithoutPage === undefined) {
    queryWithoutPage = {}
  }

  const narrowItems = getPageItems(currentPage, totalPage, SIBLING_COUNT_NARROW)
  const wideItems = getPageItems(currentPage, totalPage, SIBLING_COUNT_WIDE)
  // 省略の出方が同じなら出し分けは不要
  const isSame = narrowItems.length === wideItems.length && narrowItems.every((item, i) => item === wideItems[i])

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
        const newQuery = { ...queryWithoutPage, p: item.toString() }
        return (
          <Button key={item} variant={currentPage === item ? 'default' : 'secondary'} className="p-2 w-10" asChild>
            <Link
              href={{
                pathname: path,
                query: newQuery,
              }}
              aria-current={currentPage === item ? 'page' : undefined}
            >
              {item}
            </Link>
          </Button>
        )
      })}
    </div>
  )

  if (isSame) {
    return renderItems(wideItems)
  }
  return (
    <>
      {renderItems(narrowItems, 'sm:hidden')}
      {renderItems(wideItems, 'hidden sm:flex')}
    </>
  )
}
