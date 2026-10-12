import { notFound } from 'next/navigation'
import { getBlogInfo } from '@/lib/db_blog'
import type { SaveActionState } from '@/lib/form-state'
import { InfoForm } from '../../info-form'

export const dynamic = 'force-dynamic'

export default async function EditBlogInfo({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  // saved / purge_failed は新規作成から遷移してきたときだけ付く（更新の結果はフォームが state で表示する）
  searchParams: Promise<{ saved?: string; purge_failed?: string }>
}) {
  const { id } = await params
  const { saved, purge_failed: purgeFailed } = await searchParams

  const info = await getBlogInfo(id)
  if (!info) {
    notFound()
  }
  const initialState: SaveActionState =
    saved === '1' ? { saved: true, created: true, purgeFailed: purgeFailed === '1' } : {}

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">固定ページ編集: {info.page_pathname}</h1>
      <InfoForm mode="edit" info={info} initialState={initialState} />
    </div>
  )
}
