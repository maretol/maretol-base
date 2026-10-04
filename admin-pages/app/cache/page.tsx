import { getCacheStats, CACHE_GROUPS, type CacheGroupKey } from '@/lib/cache'
import { purgeCacheGroupAction, purgeAllCacheAction } from './actions'
import { SubmitButton } from '@/components/submit-button'

export const dynamic = 'force-dynamic'

export default async function CacheManagement({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string; purge_failed?: string }>
}) {
  const { error, done, purge_failed: purgeFailed } = await searchParams
  const stats = await getCacheStats()
  const groups = Object.entries(CACHE_GROUPS) as [CacheGroupKey, (typeof CACHE_GROUPS)[CacheGroupKey]][]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">キャッシュ管理（CMS_CACHE）</h1>
        <p className="mt-1 text-sm text-gray-500">
          コンテンツの保存時は自動でパージされます。ここは D1
          を直接編集した後や表示の不整合時などに手動でパージするための画面です
        </p>
        <p className="mt-1 text-sm text-gray-500">
          KV（CMS_CACHE）と併せて、Astro 版の公開サイトのキャッシュも「公開サイトのタグ」の単位でパージします
        </p>
      </div>

      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {done && purgeFailed !== '1' && (
        <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          パージしました: {done === 'all' ? 'すべて' : (CACHE_GROUPS[done as CacheGroupKey]?.label ?? done)}
        </p>
      )}
      {purgeFailed === '1' && (
        <p className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          KV はパージしましたが、公開サイト（Astro 版）のキャッシュ削除に失敗しました。時間をおいて再度実行してください
        </p>
      )}

      <table className="w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="p-2">グループ</th>
            <th className="p-2">対象キー</th>
            <th className="p-2">公開サイトのタグ</th>
            <th className="p-2">キャッシュ済み件数</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {groups.map(([key, def]) => (
            <tr key={key} className="border-b border-gray-100">
              <td className="p-2">{def.label}</td>
              <td className="p-2 font-mono text-xs">
                {[...def.prefixes.map((p) => `${p}*`), ...def.keys].join(', ')}
              </td>
              <td className="p-2 font-mono text-xs">{def.edgeTags.join(', ')}</td>
              <td className="p-2">{stats[key]}</td>
              <td className="p-2">
                <form action={purgeCacheGroupAction}>
                  <input type="hidden" name="group" value={key} />
                  <SubmitButton variant="secondary" size="sm" pendingText="パージ中...">
                    パージ
                  </SubmitButton>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form action={purgeAllCacheAction}>
        <SubmitButton variant="danger" pendingText="パージ中...">
          すべてパージ
        </SubmitButton>
        <p className="mt-1 text-xs text-gray-400">
          全キャッシュを削除します（公開サイトは全ページ）。直後のアクセスはD1への取得が発生しますが表示への影響はありません
        </p>
      </form>
    </div>
  )
}
