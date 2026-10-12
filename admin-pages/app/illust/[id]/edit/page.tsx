import { notFound } from 'next/navigation'
import { getAtelier, getAtelierTagIDs, listTags } from '@/lib/db'
import type { SaveActionState } from '@/lib/form-state'
import { atelierDraft } from '@/lib/draft'
import { AtelierForm } from '../../atelier-form'
import { purgeAtelierCacheAction } from '../../actions'
import { PurgeCacheButton } from '@/components/purge-cache-button'

export const dynamic = 'force-dynamic'

export default async function EditIllust({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  // saved / warning / purge_failed は新規作成から遷移してきたときだけ付く（更新の結果はフォームが state で表示する）
  searchParams: Promise<{ saved?: string; warning?: string; purge_failed?: string }>
}) {
  const { id } = await params
  const { saved, warning, purge_failed: purgeFailed } = await searchParams

  const atelier = await getAtelier(id)
  if (!atelier) {
    notFound()
  }
  const [selectedTagIDs, allTags, existingPreview] = await Promise.all([
    getAtelierTagIDs(id),
    listTags(),
    atelierDraft.getExistingPreview(id),
  ])
  const initialState: SaveActionState =
    saved === '1' ? { saved: true, created: true, warning, purgeFailed: purgeFailed === '1' } : {}

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">イラスト編集: {atelier.title}</h1>
      <PurgeCacheButton
        action={purgeAtelierCacheAction}
        contentID={id}
        label="イラストのキャッシュを削除"
        description="イラストのキャッシュは一覧・単体まとめて削除されます。保存時は自動でパージされるため、表示の不整合時などに使用してください"
      />
      <AtelierForm
        mode="edit"
        atelier={atelier}
        selectedTagIDs={selectedTagIDs}
        allTags={allTags}
        initialState={initialState}
        existingPreview={existingPreview}
      />
    </div>
  )
}
