import type { AstroGlobal } from 'astro'
import type { infoAPIResult } from 'api-types'
import { cacheTag } from 'cache-tags'
import { getInfoPage } from '@/lib/api/cms'
import { cachePage } from '@/lib/cache'
import { getEmbedTags } from '@/lib/content_tags'
import { getHostname, SITE_NAME } from '@/lib/site'

// 固定ページ（about / contact など、CMS の info を表示するページ）に共通する処理

type InfoPageOptions = {
  // info を探すパス。ページの URL と同じ
  path: string
  // <title> と OGP に出す題名（サイト名は自動で足す）
  metaTitle: string
  description: string
  // サイドバーを出すページ（layouts/BlogLayout.astro を使うページ）は true
  sidebar?: boolean
  // 検索結果に出さないページは true
  noindex?: boolean
}

type InfoPage = {
  info: infoAPIResult
  // レイアウトに渡すメタ情報
  meta: { title: string; description: string; ogTitle: string; ogDescription: string; ogURL: string; noindex: boolean }
}

// info を取得し、キャッシュの指定とメタ情報の組み立てまでを行う。ページの frontmatter で呼ぶ。
// 該当する info が無ければ 404 ページへの rewrite を返すので、呼び出し側は Response をそのまま return する
export async function loadInfoPage(
  astro: AstroGlobal,
  { path, metaTitle, description, sidebar = false, noindex = false }: InfoPageOptions,
): Promise<InfoPage | Response> {
  const info = await getInfoPage(astro.locals, path)
  if (!info) {
    // info が公開されたときに、404 のキャッシュも一緒に消えるようにする
    astro.locals.notFound = { tags: [cacheTag.info] }
    return astro.rewrite('/404')
  }

  cachePage(astro.response, [cacheTag.info, ...getEmbedTags(info.parsed_content)], { sidebar })

  const title = `${metaTitle} | ${SITE_NAME}`
  return {
    info,
    meta: {
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogURL: `${getHostname()}${path}`,
      noindex,
    },
  }
}
