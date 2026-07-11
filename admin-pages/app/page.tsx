import { getCloudflareContext } from '@opennextjs/cloudflare'
import Link from 'next/link'

// 管理ページはすべて動的レンダリング（キャッシュしない）
export const dynamic = 'force-dynamic'

async function getCounts() {
  try {
    const { env } = await getCloudflareContext({ async: true })
    const row = await env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM ateliers) AS ateliers,
        (SELECT COUNT(*) FROM atelier_tags) AS atelier_tags`
    ).first<{ ateliers: number; atelier_tags: number }>()
    return { ok: true as const, ateliers: row?.ateliers ?? 0, atelierTags: row?.atelier_tags ?? 0 }
  } catch (e) {
    console.error('D1 access error:', e)
    return { ok: false as const }
  }
}

export default async function Home() {
  const counts = await getCounts()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/illust" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-400">
          <p className="text-sm text-gray-500">イラスト（atelier）</p>
          <p className="mt-1 text-3xl font-bold">{counts.ok ? counts.ateliers : '—'}</p>
          <p className="mt-1 text-xs text-gray-400">タグ {counts.ok ? counts.atelierTags : '—'} 件</p>
        </Link>
        <div className="rounded-lg border border-dashed border-gray-300 p-4 text-gray-400">
          <p className="text-sm">マンガ（bande-dessinee）</p>
          <p className="mt-1 text-xs">M5 で移行予定</p>
        </div>
        <div className="rounded-lg border border-dashed border-gray-300 p-4 text-gray-400">
          <p className="text-sm">ブログ（blog）</p>
          <p className="mt-1 text-xs">M6 で移行予定</p>
        </div>
      </section>

      {!counts.ok && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          D1（maretol-cms）への接続に失敗しました。バインディング設定とマイグレーション適用状況を確認してください
        </p>
      )}
    </div>
  )
}
