import { getCacheStats, CACHE_GROUPS, type CacheGroupKey } from '@/lib/cache'
import { purgeCacheGroupAction, purgeAllCacheAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function CacheManagement({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>
}) {
  const { error, done } = await searchParams
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
      </div>

      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {done && (
        <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          パージしました: {done === 'all' ? 'すべて' : (CACHE_GROUPS[done as CacheGroupKey]?.label ?? done)}
        </p>
      )}

      <table className="w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="p-2">グループ</th>
            <th className="p-2">対象キー</th>
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
              <td className="p-2">{stats[key]}</td>
              <td className="p-2">
                <form action={purgeCacheGroupAction}>
                  <input type="hidden" name="group" value={key} />
                  <button
                    type="submit"
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
                  >
                    パージ
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form action={purgeAllCacheAction}>
        <button type="submit" className="rounded-md bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-600">
          すべてパージ
        </button>
        <p className="mt-1 text-xs text-gray-400">
          全キャッシュを削除します。直後のアクセスはD1への取得が発生しますが表示への影響はありません
        </p>
      </form>
    </div>
  )
}
