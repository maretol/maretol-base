import { getCloudflareContext } from '@opennextjs/cloudflare'

export const dynamic = 'force-dynamic'

type AtelierListRow = {
  id: string
  title: string
  src: string
  status: string
  description_format: string
  published_at: string | null
  updated_at: string
}

async function getAteliers(): Promise<AtelierListRow[]> {
  const { env } = await getCloudflareContext({ async: true })
  const result = await env.DB.prepare(
    `SELECT id, title, src, status, description_format, published_at, updated_at
     FROM ateliers ORDER BY published_at DESC`
  ).all<AtelierListRow>()
  return result.results
}

const statusLabel: Record<string, string> = {
  PUBLISH: '公開',
  DRAFT: '下書き',
  CLOSED: '非公開',
}

export default async function IllustList() {
  const ateliers = await getAteliers()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">イラスト一覧</h1>
        {/* TODO: M4 CRUD実装で新規作成ボタンを追加する */}
      </div>

      <table className="w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="p-2">ID</th>
            <th className="p-2">タイトル</th>
            <th className="p-2">状態</th>
            <th className="p-2">形式</th>
            <th className="p-2">公開日時</th>
          </tr>
        </thead>
        <tbody>
          {ateliers.map((a) => (
            <tr key={a.id} className="border-b border-gray-100">
              <td className="p-2 font-mono text-xs">{a.id}</td>
              <td className="p-2">{a.title}</td>
              <td className="p-2">{statusLabel[a.status] ?? a.status}</td>
              <td className="p-2 font-mono text-xs">{a.description_format}</td>
              <td className="p-2 text-xs">{a.published_at ?? '-'}</td>
            </tr>
          ))}
          {ateliers.length === 0 && (
            <tr>
              <td colSpan={5} className="p-4 text-center text-gray-400">
                データがありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
