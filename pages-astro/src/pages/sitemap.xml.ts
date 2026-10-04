import type { APIRoute } from 'astro'
import { cacheTag } from 'cache-tags'
import { cachePage, latestListTags } from '@/lib/cache'
import { getHostname } from '@/lib/site'

// sitemap。現行と同じく、入口になるページだけを載せる（個々の記事は載せない）
const pages = [
  { path: '', changeFrequency: 'daily', priority: 1 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/blog', changeFrequency: 'daily', priority: 0.7 },
  { path: '/comics', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/illust', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/tag', changeFrequency: 'weekly', priority: 0.6 },
]

export const GET: APIRoute = () => {
  const host = getHostname()
  // lastmod は描画した時刻。載せているページのどれかが変わる保存（記事・漫画・イラスト・タグ・info）でパージされ、そのときに新しくなる
  const lastModified = new Date().toISOString()

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${host}${page.path}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>${page.changeFrequency}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`

  const headers = new Headers({ 'Content-Type': 'application/xml' })
  cachePage({ headers }, [...latestListTags, cacheTag.info])
  return new Response(body, { headers })
}
