import { notFound } from 'next/navigation'
import { getBandeDessinee, listComicTags, listComicSeries, listBandeDessineeRefs } from '@/lib/db_comic'
import type { SaveActionState } from '@/lib/form-state'
import { comicDraft } from '@/lib/draft_comic'
import { ComicForm } from '../../comic-form'
import { purgeBandeDessineeCacheAction } from '../../actions'
import { PurgeCacheButton } from '@/components/purge-cache-button'

export const dynamic = 'force-dynamic'

export default async function EditComic({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  // saved / info / warning / purge_failed は新規作成から遷移してきたときだけ付く（更新の結果はフォームが state で表示する）
  searchParams: Promise<{ saved?: string; info?: string; warning?: string; purge_failed?: string }>
}) {
  const { id } = await params
  const { saved, info, warning, purge_failed: purgeFailed } = await searchParams

  const comic = await getBandeDessinee(id)
  if (!comic) {
    notFound()
  }
  const [allTags, allSeries, allComics, existingPreview] = await Promise.all([
    listComicTags(),
    listComicSeries(),
    listBandeDessineeRefs(),
    comicDraft.getExistingPreview(id),
  ])
  const initialState: SaveActionState =
    saved === '1' ? { saved: true, created: true, info, warning, purgeFailed: purgeFailed === '1' } : {}

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">マンガ編集: {comic.title_name}</h1>
      <PurgeCacheButton
        action={purgeBandeDessineeCacheAction}
        contentID={id}
        label="マンガのキャッシュを削除"
        description="マンガのキャッシュは一覧・単体まとめて削除されます。保存時は自動でパージされるため、表示の不整合時などに使用してください"
      />
      <ComicForm
        mode="edit"
        comic={comic}
        allTags={allTags}
        allSeries={allSeries}
        allComics={allComics}
        initialState={initialState}
        existingPreview={existingPreview}
      />
    </div>
  )
}
