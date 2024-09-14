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
  return (
    <div className="flex flex-row items-center ml-1 gap-x-1">
      {tags.map((t, i) => {
        const appendTagIDs = [...tagIDs, t.id]
        const appendTagNames = [...tagNames, t.name]
        const detachTagIDs = tagIDs.filter((id) => id !== t.id)
        const detachTagNames = tagNames.filter((name) => name !== t.name)
        return (
          <div key={`tag-${i}`}>
            {tagIDs.includes(t.id) ? (
              <Button variant={tagIDs.includes(t.id) ? 'secondary' : 'default'} asChild>
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
              <Button variant={tagIDs.includes(t.id) ? 'secondary' : 'default'} asChild>
                <Link
                  href={{
                    pathname: '/tag',
                    query: {
                      tag_id: appendTagIDs,
                      tag_name: appendTagNames,
                    },
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
