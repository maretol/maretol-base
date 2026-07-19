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
        (SELECT COUNT(*) FROM atelier_tags) AS atelier_tags,
        (SELECT COUNT(*) FROM bande_dessinees) AS comics,
        (SELECT COUNT(*) FROM bande_dessinee_tags) AS comic_tags,
        (SELECT COUNT(*) FROM bande_dessinee_series) AS comic_series,
        (SELECT COUNT(*) FROM novels) AS novels,
        (SELECT COUNT(*) FROM novel_tags) AS novel_tags,
        (SELECT COUNT(*) FROM novel_series) AS novel_series,
        (SELECT COUNT(*) FROM blog_contents) AS blogs,
        (SELECT COUNT(*) FROM blog_categories) AS blog_categories,
        (SELECT COUNT(*) FROM blog_info) AS blog_info`
    ).first<{
      ateliers: number
      atelier_tags: number
      comics: number
      comic_tags: number
      comic_series: number
      novels: number
      novel_tags: number
      novel_series: number
      blogs: number
      blog_categories: number
      blog_info: number
    }>()
    return {
      ok: true as const,
      ateliers: row?.ateliers ?? 0,
      atelierTags: row?.atelier_tags ?? 0,
      comics: row?.comics ?? 0,
      comicTags: row?.comic_tags ?? 0,
      comicSeries: row?.comic_series ?? 0,
      novels: row?.novels ?? 0,
      novelTags: row?.novel_tags ?? 0,
      novelSeries: row?.novel_series ?? 0,
      blogs: row?.blogs ?? 0,
      blogCategories: row?.blog_categories ?? 0,
      blogInfo: row?.blog_info ?? 0,
    }
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
        <Link href="/comic" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-400">
          <p className="text-sm text-gray-500">マンガ（bande-dessinee）</p>
          <p className="mt-1 text-3xl font-bold">{counts.ok ? counts.comics : '—'}</p>
          <p className="mt-1 text-xs text-gray-400">
            タグ {counts.ok ? counts.comicTags : '—'} 件 / シリーズ {counts.ok ? counts.comicSeries : '—'} 件
          </p>
        </Link>
        <Link href="/novel" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-400">
          <p className="text-sm text-gray-500">小説（novel）</p>
          <p className="mt-1 text-3xl font-bold">{counts.ok ? counts.novels : '—'}</p>
          <p className="mt-1 text-xs text-gray-400">
            タグ {counts.ok ? counts.novelTags : '—'} 件 / シリーズ {counts.ok ? counts.novelSeries : '—'} 件
          </p>
        </Link>
        <Link href="/blog" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-400">
          <p className="text-sm text-gray-500">ブログ（blog）</p>
          <p className="mt-1 text-3xl font-bold">{counts.ok ? counts.blogs : '—'}</p>
          <p className="mt-1 text-xs text-gray-400">
            カテゴリ {counts.ok ? counts.blogCategories : '—'} 件 / 固定ページ {counts.ok ? counts.blogInfo : '—'} 件
          </p>
        </Link>
      </section>

      {!counts.ok && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          D1（maretol-cms）への接続に失敗しました。バインディング設定とマイグレーション適用状況を確認してください
        </p>
      )}
    </div>
  )
}
