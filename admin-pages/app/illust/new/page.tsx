import { listTags } from '@/lib/db'
import { AtelierForm } from '../atelier-form'

export const dynamic = 'force-dynamic'

export default async function NewIllust({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; preview?: string }>
}) {
  const { error, preview } = await searchParams
  const allTags = await listTags()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">イラスト新規作成</h1>
      <AtelierForm mode="new" allTags={allTags} error={error} previewURL={preview} />
    </div>
  )
}
