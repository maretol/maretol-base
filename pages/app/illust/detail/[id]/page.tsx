import { getAtelierByID } from '@/lib/api/workers'
import { convertJST } from '@/lib/time'
import { Metadata } from 'next'
import { OuterIllustArticle } from '@/components/large/illust_article'
import { getOGPImageURL } from '@/lib/image'

type Props = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ draftKey?: string }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params
  const draftKey = (await searchParams)?.draftKey

  const atelier = await getAtelierByID(id, draftKey)

  if (!atelier) {
    return {
      title: 'Not Found',
      description: 'ページが見つかりません',
    }
  }

  const title = `Illustration: ${atelier.title} | Maretol Base`

  return {
    title: title,
    description: title,
    openGraph: {
      title: title,
      description: title,
      images: [getOGPImageURL(atelier.src)],
      type: 'article',
      publishedTime: atelier.publishedAt,
      modifiedTime: atelier.updatedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: title,
      images: [getOGPImageURL(atelier.src)],
    },
  }
}

export default async function IllustPage({ params, searchParams }: Props) {
  const { id } = await params
  const draftKey = (await searchParams)?.draftKey

  const atelier = await getAtelierByID(id, draftKey)

  if (!atelier) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">404</h1>
          <p className="mt-2">イラストが見つかりません</p>
        </div>
      </div>
    )
  }

  const publishedAt = convertJST(atelier.publishedAt)

  return (
    <div>
      <OuterIllustArticle
        id={atelier.id}
        title={atelier.title}
        imageSrc={atelier.src}
        objectPosition="center"
        tags={atelier.tag_or_category}
        publishedAt={publishedAt}
        description={atelier.parsed_description}
      />
    </div>
  )
}
