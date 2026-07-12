import { notFound } from 'next/navigation'
import { getAtelier, getAtelierTagIDs, listTags } from '@/lib/db'
import { AtelierForm } from '../../atelier-form'
import { purgeAtelierCacheAction } from '../../actions'
import { PurgeCacheButton } from '@/components/purge-cache-button'

export const dynamic = 'force-dynamic'

export default async function EditIllust({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams

  const atelier = await getAtelier(id)
  if (!atelier) {
    notFound()
  }
  const [selectedTagIDs, allTags] = await Promise.all([getAtelierTagIDs(id), listTags()])

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
        error={error}
      />
    </div>
  )
}
