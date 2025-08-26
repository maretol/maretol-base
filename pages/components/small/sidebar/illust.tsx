import { atelierResult } from 'api-types'
import SidebarContentFrame from '../sidebar_content'
import ClientImage2 from '../client_image2'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { convertJST } from '@/lib/time'

type illust = {
  id: string
  title: string
  imageSrc: string
  publishedAt: string
  objectPosition: string
}

export default async function IllustSidebar({ atelier }: { atelier: atelierResult[] }) {
  const illustData: illust[] = atelier.map((a) => {
    const id = a.id
    const title = a.title
    const imageSrc = a.src
    const objectPosition = a.object_position || 'center'
    return {
      id,
      title,
      imageSrc,
      publishedAt: a.publishedAt,
      objectPosition,
    }
  })

  return (
    <SidebarContentFrame title="Illustrations">
      <div className="p-2">
        {illustData.map((illust) => (
          <IllustLink
            key={illust.id}
            id={illust.id}
            title={illust.title}
            publishedAt={illust.publishedAt}
            imageSrc={illust.imageSrc}
            objectPosition={illust.objectPosition}
          />
        ))}
        <Button variant="secondary" className="w-full mt-2" asChild>
          <Link href="/illust" className="text-gray-500">
            <p className="font-bold">See latest illustrations</p>
          </Link>
        </Button>
      </div>
    </SidebarContentFrame>
  )
}

function IllustLink({ id, title, imageSrc, publishedAt, objectPosition }: illust) {
  return (
    <div className="mb-4 relative w-full">
      <Link href={`/illust/detail/${id}`} className="hover:underline">
        <div className="bg-gray-200 p-4">
          <ClientImage2
            src={imageSrc}
            alt={title}
            width={100}
            height={100}
            quality={75}
            className={cn('w-full h-auto max-h-36 object-cover', `object-${objectPosition}`)}
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
