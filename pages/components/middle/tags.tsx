import { categoryAPIResult } from 'api-types'
import { Button } from '../ui/button'
import Link from 'next/link'

export default function Tags({ tags }: { tags: categoryAPIResult[] }) {
  return (
    <div className="p-0 flex gap-2 items-center">
      Tag :
      {tags.map((tag) => {
        return (
          <Button key={tag.id} variant="secondary" className="p-2 h-6" asChild>
            <Link
              key={tag.id}
              href={{
                pathname: '/tag',
                query: { tag_id: tag.id, tag_name: tag.name },
              }}
            >
              {tag.name}
            </Link>
          </Button>
        )
      })}
    </div>
  )
}
