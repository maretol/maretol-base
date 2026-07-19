import { listNovelTags, listNovelSeries, listNovelRefs } from '@/lib/db_novel'
import { NovelForm } from '../novel-form'

export const dynamic = 'force-dynamic'

export default async function NewNovel({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const [allTags, allSeries, allNovels] = await Promise.all([listNovelTags(), listNovelSeries(), listNovelRefs()])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">小説新規作成</h1>
      <NovelForm mode="new" allTags={allTags} allSeries={allSeries} allNovels={allNovels} error={error} />
    </div>
  )
}
