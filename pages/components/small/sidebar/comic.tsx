import { bandeDessineeResult } from 'api-types'
import SidebarContentFrame from '../sidebar_content'
import Link from 'next/link'
import { convertJST } from '@/lib/time'
import ClientImage from '../client_image'
import { rewriteImageURL } from '@/lib/image'
import { sidebarImageOption } from '@/lib/static'
import { Button } from '@/components/ui/button'

type comic = {
  id: string
  title: string
  publishedAt: string
  coverImage: string
}

export default async function ComicSidebar({ bandeDessinees }: { bandeDessinees: bandeDessineeResult[] }) {
  const comicsData: comic[] = bandeDessinees.map((comic) => {
    const coverImageFile = comic.cover || comic.filename + '_00' + comic.first_page + comic.format[0]
    const contentsBaseURL = comic.contents_url.replaceAll('/index.json', '')
    const coverImage = contentsBaseURL + '/' + coverImageFile
    return {
      id: comic.id,
      title: comic.title_name,
      publishedAt: comic.publishedAt,
      coverImage: coverImage,
    }
  })

  return (
    <SidebarContentFrame title="Comics">
      <div className="p-2">
        {comicsData.map((comic) => (
          <ComicLink
            key={comic.id}
            id={comic.id}
            title={comic.title}
            publishedAt={comic.publishedAt}
            coverImage={comic.coverImage}
          />
        ))}
        <Button variant="secondary" className="w-full mt-2" asChild>
          <Link href="/comics" className="text-gray-500">
            <p className="font-bold">See all comics</p>
          </Link>
        </Button>
      </div>
    </SidebarContentFrame>
  )
}

function ComicLink({ id, title, publishedAt, coverImage }: comic) {
  const option = sidebarImageOption
  const cdnCoverImage = rewriteImageURL(option, coverImage)
  return (
    <div className="mb-4 ">
      <Link href={`/comics/${id}`} className="hover:underline relative">
        <div className="bg-gray-200 p-4">
          <ClientImage
            src={cdnCoverImage}
            width={100}
            height={150}
            className="w-full h-auto object-contain"
            alt={title}
          />
        </div>
        <div className="bg-gray-800/60 absolute bottom-0 w-full p-1">
          <p className="text-gray-200 font-semibold">{title}</p>
          <p className="text-gray-300">{convertJST(publishedAt)}</p>
        </div>
      </Link>
    </div>
  )
}
