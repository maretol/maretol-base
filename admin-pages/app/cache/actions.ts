'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { purgeCacheGroup, purgeAllCMSCache } from '@/lib/cache'
import { CACHE_GROUPS, type CacheGroupKey } from '@/lib/cache-groups'
import { withPurgeResult } from '@/lib/purge_result'
import { text } from '@/lib/form-data'

export async function purgeCacheGroupAction(formData: FormData): Promise<void> {
  const group = text(formData, 'group')
  if (!(group in CACHE_GROUPS)) {
    redirect(`/cache?error=${encodeURIComponent('不正なグループ指定です')}`)
  }

  const purged = await purgeCacheGroup(group as CacheGroupKey)

  revalidatePath('/cache')
  redirect(doneURL(group, purged))
}

export async function purgeAllCacheAction(): Promise<void> {
  const purged = await purgeAllCMSCache()

  revalidatePath('/cache')
  redirect(doneURL('all', purged))
}

// パージ後の遷移先。公開サイト（Astro 版）のキャッシュ削除に失敗した場合は画面で知らせる
function doneURL(done: string, purged: boolean): string {
  return withPurgeResult(`/cache?done=${encodeURIComponent(done)}`, purged)
}
