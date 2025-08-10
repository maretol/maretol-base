import { cn } from '@/lib/utils'
import ClientImage2 from '../small/client_image2'
import { atelierTagAndCategory } from 'api-types'
import Hn from '../middle/article_dom/h'
import { Button } from '../ui/button'
import Link from 'next/link'

export async function IllustSampleArticle({
  id,
  title,
  imageSrc,
  objectPosition,
  tags,
  publishedAt,
}: {
  id: string
  title: string
  imageSrc: string
  objectPosition: string
  tags: atelierTagAndCategory[]
  publishedAt: string
}) {
  const formattedTags = tags.map((tag) => {
    return { id: tag.id, name: tag.tag, type: tag.type[0] }
  })
  const positionCn = `object-${objectPosition}`

  return (
    <div className={cn('w-full h-[45svh] max-h-3/4 rounded-2xl bg-gray-200', 'flex flex-row')}>
      <ClientImage2
        src={imageSrc}
        alt={title}
        width={1080}
        height={1080}
        quality={90}
        className={cn('w-3/4 h-full rounded-2xl', positionCn)}
      />
      <div className="p-4 h-full">
        <h1 className="font-bold text-2xl">{title}</h1>
        <Button asChild>
          <Link href={`/illust/detail/${id}`} className="flex items-center gap-2" scroll={false}>
            Detail
          </Link>
        </Button>
      </div>
    </div>
  )
}
