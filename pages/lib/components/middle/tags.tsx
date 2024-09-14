import { categoryAPIResult } from '@/lib/api/result'
import { Button } from '../ui/button'
import Link from 'next/link'

export default function Tags({ tags }: { tags: categoryAPIResult[] }) {
  return (
    <div className="p-0 flex gap-2 items-center">
      Tag :
      {tags.map((tag) => {
        return (
          <Link
            key={tag.id}
            href={{
              pathname: '/tag',
              query: { tag_id: tag.id, tag_name: tag.name },
            }}
          >
            <Button key={tag.id} variant="secondary" className="p-2">
              {tag.name}
            </Button>
          </Link>
        )
      })}
    </div>
  )
}
