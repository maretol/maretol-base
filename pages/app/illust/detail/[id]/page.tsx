import { getAtelierByID } from '@/lib/api/workers'
import { Metadata } from 'next'
import { getOGPImageURL } from '@/lib/image'
import ClientIllustPage from './client_page'

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

  return (
    <div>
      <ClientIllustPage illustID={id} draftKey={draftKey} />
    </div>
  )
}
