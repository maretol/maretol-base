'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { categoryAPIResult } from 'api-types'
import SidebarContentFrame from '../sidebar_content'
import { useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { NavigationProgressBar } from '../navigation_progress'

type tag = {
  name: string
  id: string
}

export default function TagSidebar({ tags }: { tags: categoryAPIResult[] }) {
  const router = useRouter()
  // router.push は useLinkStatus で拾えないため、transition の pending でインジケーターを出す
  const [isPending, startTransition] = useTransition()

  const tagData: tag[] = tags.map((tag) => ({
    name: tag.name,
    id: tag.id,
  }))

  const selectCallback = useCallback(
    (value: string) => {
      startTransition(() => {
        router.push(`/tag?tag_id=${value}`)
      })
    },
    [router]
  )

  return (
    <SidebarContentFrame title="Tags">
      <NavigationProgressBar pending={isPending} />
      <Select onValueChange={selectCallback}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="タグ一覧" />
        </SelectTrigger>
        <SelectContent>
          {tagData.map((tag) => (
            <SelectItem key={tag.id} value={tag.id}>
              {tag.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SidebarContentFrame>
  )
}
