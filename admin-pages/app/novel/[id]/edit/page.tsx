import { notFound } from 'next/navigation'
import { getNovel, listNovelTags, listNovelSeries, listNovelRefs } from '@/lib/db_novel'
import { NovelForm } from '../../novel-form'
import { purgeNovelCacheAction } from '../../actions'
import { PurgeCacheButton } from '@/components/purge-cache-button'

export const dynamic = 'force-dynamic'

export default async function EditNovel({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; saved?: string; info?: string }>
}) {
  const { id } = await params
  const { error, saved, info } = await searchParams

  const novel = await getNovel(id)
  if (!novel) {
    notFound()
  }
  const [allTags, allSeries, allNovels] = await Promise.all([listNovelTags(), listNovelSeries(), listNovelRefs()])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">小説編集: {novel.title_name}</h1>
      <PurgeCacheButton
        action={purgeNovelCacheAction}
        contentID={id}
        label="小説のキャッシュを削除"
        description="小説のキャッシュは一覧・単体・本文まとめて削除されます。保存時は自動でパージされるため、表示の不整合時などに使用してください"
      />
      <NovelForm
        mode="edit"
        novel={novel}
        allTags={allTags}
        allSeries={allSeries}
        allNovels={allNovels}
        error={error}
        saved={saved === '1'}
        info={info}
      />
    </div>
  )
}
