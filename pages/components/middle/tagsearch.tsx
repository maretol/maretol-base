import Link from 'next/link'
import { Button } from '../ui/button'
import { categoryAPIResult } from 'api-types'

export default function TagSelector({
  tags,
  selectedTagID,
}: {
  tags: categoryAPIResult[]
  selectedTagID: string | undefined
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t, i) => {
        const isSelected = t.id === selectedTagID
        return (
          <div key={`tag-${i}`}>
            {isSelected ? (
              <Button variant="secondary" asChild>
                <Link href={{ pathname: '/tag' }}>{t.name}</Link>
              </Button>
            ) : (
              <Button variant="default" asChild>
                <Link
                  href={{
                    pathname: '/tag',
                    query: { tag_id: t.id },
                  }}
                >
                  {t.name}
                </Link>
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
