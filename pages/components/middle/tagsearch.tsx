import AppLink from '@/components/small/app_link'
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
                <AppLink href={{ pathname: '/tag' }}>{t.name}</AppLink>
              </Button>
            ) : (
              <Button variant="default" asChild>
                <AppLink
                  href={{
                    pathname: '/tag',
                    query: { tag_id: t.id },
                  }}
                >
                  {t.name}
                </AppLink>
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
