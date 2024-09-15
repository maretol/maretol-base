import Link from 'next/link'
import { Button } from '../ui/button'

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

  const pages = Array.from({ length: totalPage }, (_, i) => i + 1)
  return (
    <div className="flex gap-2">
      {pages.map((page) => {
        const newQuery = { ...queryWithoutPage, p: page.toString() }
        return (
          <Button
            key={page}
            variant={currentPage === page ? 'default' : 'secondary'}
            className="p-2 w-10"
            asChild
          >
            <Link
              key={page}
              href={{
                pathname: path,
                query: newQuery,
              }}
            >
              {page}
            </Link>
          </Button>
        )
      })}
    </div>
  )
}
