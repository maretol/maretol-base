import { listBlogStatic } from '@/lib/db_blog'
import { updateBlogStaticAction } from '../actions'
import { SubmitButton } from '@/components/submit-button'

export const dynamic = 'force-dynamic'

// タイムスタンプ行は編集対象から外す（API互換用の値のため）
const READONLY_KEYS = ['createdAt', 'updatedAt', 'publishedAt', 'revisedAt']

export default async function BlogStatic({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const entries = await listBlogStatic()
  const editable = entries.filter((e) => !READONLY_KEYS.includes(e.key))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">静的文言管理（サイドバー・トップページ等）</h1>

      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="space-y-4">
        {editable.map((e) => (
          <form
            key={e.key}
            action={updateBlogStaticAction}
            className="space-y-2 rounded-lg border border-gray-200 bg-white p-4"
          >
            <input type="hidden" name="key" value={e.key} />
            <label className="block font-mono text-sm font-medium">{e.key}</label>
            <textarea
              name="value"
              defaultValue={e.value}
              rows={Math.min(6, Math.max(2, e.value.split('\n').length))}
              className="w-full rounded-md border border-gray-300 p-2 text-sm"
            />
            <SubmitButton size="sm" pendingText="保存中...">
              保存
            </SubmitButton>
          </form>
        ))}
      </div>
    </div>
  )
}
