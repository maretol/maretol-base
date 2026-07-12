import { notFound } from 'next/navigation'
import { getAtelier, getAtelierTagIDs, listTags } from '@/lib/db'
import { AtelierForm } from '../../atelier-form'

export const dynamic = 'force-dynamic'

export default async function EditIllust({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; saved?: string }>
}) {
  const { id } = await params
  const { error, saved } = await searchParams

  const atelier = await getAtelier(id)
  if (!atelier) {
    notFound()
  }
  const [selectedTagIDs, allTags] = await Promise.all([getAtelierTagIDs(id), listTags()])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">イラスト編集: {atelier.title}</h1>
      <AtelierForm
        mode="edit"
        atelier={atelier}
        selectedTagIDs={selectedTagIDs}
        allTags={allTags}
        error={error}
        saved={saved === '1'}
      />
    </div>
  )
}
