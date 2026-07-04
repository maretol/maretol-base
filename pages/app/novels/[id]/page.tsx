import { metadata } from '@/app/layout'
import BaseLayout from '@/components/large/base_layout'
import { NovelDetailPage } from '@/components/large/novels'
import NovelReader from '@/components/middle/novelbook'
import { getNovelByID, getNovelBody } from '@/lib/api/workers'
import { getHostname } from '@/lib/env'
import { getDefaultOGPImageURL, getOGPImageURL } from '@/lib/image'
import { parseNovelText } from '@/lib/novel/parseNovelText'
import { parseDraftKey } from '@/lib/searchParams'
import { Metadata } from 'next'

// 表紙が完全な http(s) URL のときのみ OGP 画像に採用し、無ければ既定 OGP にフォールバックする
function resolveOGPImage(cover?: string): string {
  if (cover && cover.startsWith('http')) {
    return getOGPImageURL(cover)
  }
  return getDefaultOGPImageURL()
}

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const searchParams = await props.searchParams
  const params = await props.params
  const id = params.id
  const draftKey = parseDraftKey(searchParams)

  const data = await getNovelByID(id, draftKey)
  const title = data.title_name || 'Novel'
  const ogpImage = resolveOGPImage(data.cover)

  return {
    ...metadata,
    title: title + ' | Maretol Base',
    twitter: {
      ...metadata.twitter,
      card: 'summary_large_image',
      title: title + ' | Maretol Base',
      images: [ogpImage],
    },
    openGraph: {
      ...metadata.openGraph,
      title: title + ' | Maretol Base',
      url: `${getHostname()}/novels/${id}`,
      images: [ogpImage],
    },
  } as Metadata
}

export default async function NovelPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams
  const id = params.id
  const draftKey = parseDraftKey(searchParams)

  const data = await getNovelByID(id, draftKey)
  // 該当の小説が存在しない場合（取得失敗時は空オブジェクト）はエラー境界（error.tsx）へ
  if (!data.id) {
    throw new Error('Novel not found')
  }

  // 本文（外部プレーンテキスト）を別系統キャッシュから取得し、サーバでパースしてリーダーへ渡す
  const body = await getNovelBody(id, data.contents_url, draftKey)
  const html = parseNovelText(body)

  return (
    <BaseLayout>
      <NovelReader html={html} />
      <NovelDetailPage
        id={id}
        titleName={data.title_name}
        publishedAt={data.publishedAt}
        updatedAt={data.updatedAt}
        publishDate={data.publish_date ?? null}
        publishEvent={data.publish_event ?? null}
        nextId={data.next_id ?? null}
        previousId={data.previous_id ?? null}
        seriesId={data.series?.id ?? null}
        seriesName={data.series?.series_name ?? null}
        tagId={data.tag?.id ?? ''}
        tagName={data.tag?.tag_name ?? ''}
        cover={data.cover ?? null}
        parsedDescription={data.parsed_description}
        tableOfContents={data.table_of_contents}
      />
    </BaseLayout>
  )
}
