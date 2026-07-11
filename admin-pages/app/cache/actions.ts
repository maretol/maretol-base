'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { purgeCacheGroup, purgeAllCMSCache, CACHE_GROUPS, type CacheGroupKey } from '@/lib/cache'

export async function purgeCacheGroupAction(formData: FormData): Promise<void> {
  const group = formData.get('group') as string
  if (!(group in CACHE_GROUPS)) {
    redirect(`/cache?error=${encodeURIComponent('不正なグループ指定です')}`)
  }

  await purgeCacheGroup(group as CacheGroupKey)

  revalidatePath('/cache')
  redirect(`/cache?done=${encodeURIComponent(group)}`)
}

export async function purgeAllCacheAction(): Promise<void> {
  await purgeAllCMSCache()

  revalidatePath('/cache')
  redirect(`/cache?done=${encodeURIComponent('all')}`)
}
