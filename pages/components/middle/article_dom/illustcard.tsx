import ClientImage2 from '@/components/small/client_image2'
import { Button } from '@/components/ui/button'
import { getAtelierByID } from '@/lib/api/workers'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default async function IllustCard({ link, articleID }: { link: string; articleID: string }) {
  const linkURL = new URL(link)
  const linkPath = linkURL.pathname
  const illustID = linkPath.split('/')[3]
  const atelierData = await getAtelierByID(illustID)
  const drawerLink = `/blog/${articleID}/illust/${illustID}`

  const title = atelierData.title
  const publishedAt = atelierData.publishedAt
  const illustSrc = atelierData.src
  const objectPosition = atelierData.object_position || 'center'

  return (
    <div className="max-w-2xl">
      <div className="bg-gray-300 h-full w-full px-4 py-2 rounded-md font-semibold">
        <div className="flex flex-row space-x-4">
          <ClientImage2
            src={illustSrc}
            alt={title}
            width={400}
            height={400}
            format="auto"
            className={cn('w-2/3 h-56 object-full rounded-sm', `object-${objectPosition}`)}
          />
          <div className={'w-1/3 flex flex-col justify-between items-start'}>
            <div className="w-full">
              <p className="text-xl font-semibold">{title}</p>
              <p className="text-gray-500 text-xs text-wrap line-clamp-2">{publishedAt}</p>
            </div>
            <div className="w-full">
              <Button className="w-full h-8" asChild>
                <Link href={drawerLink}>View illust</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
