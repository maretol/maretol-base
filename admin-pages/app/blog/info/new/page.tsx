import { InfoForm } from '../info-form'

export const dynamic = 'force-dynamic'

export default async function NewBlogInfo({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">固定ページ新規作成</h1>
      <InfoForm mode="new" error={error} />
    </div>
  )
}
