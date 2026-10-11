import { InfoForm } from '../info-form'

export const dynamic = 'force-dynamic'

export default function NewBlogInfo() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">固定ページ新規作成</h1>
      <InfoForm mode="new" />
    </div>
  )
}
