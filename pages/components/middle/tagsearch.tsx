import Link from 'next/link'
import { Button } from '../ui/button'
import { categoryAPIResult } from 'api-types'

export default function TagSelector({
  tags,
  tagIDs,
  tagNames,
}: {
  tags: categoryAPIResult[]
  tagIDs: string[]
  tagNames: string[]
}) {
  const maxTags = 3
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t, i) => {
        const appendTagIDs = [...tagIDs, t.id]
        const appendTagNames = [...tagNames, t.name]
        const detachTagIDs = tagIDs.filter((id) => id !== t.id)
        const detachTagNames = tagNames.filter((name) => name !== t.name)
        const isSelected = tagIDs.includes(t.id)
        const isMaxReached = tagIDs.length >= maxTags
        return (
          <div key={`tag-${i}`}>
            {isSelected ? (
              <Button variant="secondary" asChild>
                <Link
                  href={{
                    pathname: '/tag',
                    query: {
                      tag_id: detachTagIDs,
                      tag_name: detachTagNames,
                    },
                  }}
                >
                  {t.name}
                </Link>
              </Button>
            ) : (
              <Button variant="default" asChild disabled={isMaxReached}>
                <Link
                  href={{
                    pathname: '/tag',
                    query: {
                      tag_id: appendTagIDs,
                      tag_name: appendTagNames,
                    },
                  }}
                  className={isMaxReached ? 'pointer-events-none opacity-50' : ''}
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
