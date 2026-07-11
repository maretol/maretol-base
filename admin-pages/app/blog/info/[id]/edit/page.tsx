import { notFound } from 'next/navigation'
import { getBlogInfo } from '@/lib/db_blog'
import { InfoForm } from '../../info-form'

export const dynamic = 'force-dynamic'

export default async function EditBlogInfo({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams

  const info = await getBlogInfo(id)
  if (!info) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">固定ページ編集: {info.page_pathname}</h1>
      <InfoForm mode="edit" info={info} error={error} />
    </div>
  )
}
