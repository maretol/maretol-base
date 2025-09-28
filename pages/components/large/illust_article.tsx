import { cn } from '@/lib/utils'
import ClientImage2 from '../small/client_image2'
import { atelierTagAndCategory } from 'api-types'
import { Button } from '../ui/button'
import Link from 'next/link'
import IllustTags from '../middle/illust_tags'
import { ZoomIn } from 'lucide-react'

type IllustArticleProps = {
  id: string
  title: string
  imageSrc: string
  objectPosition: string
  tags: atelierTagAndCategory[]
  publishedAt: string
  className?: string
}

export async function IllustSampleArticle({
  id,
  title,
  imageSrc,
  objectPosition,
  tags,
  publishedAt,
  className = '',
}: IllustArticleProps) {
  const positionCn = `object-${objectPosition}`

  return (
    <div className={cn('w-full lg:h-[45svh] max-h-3/4 rounded-lg bg-gray-100', 'flex lg:flex-row flex-col', className)}>
      <Link href={`/illust/detail/${id}`} className={'lg:w-3/4 w-full lg:h-full h-[45svh]'} scroll={false}>
        <ClientImage2
          src={imageSrc}
          alt={title}
          width={1080}
          height={1080}
          quality={90}
          className={cn('w-full h-full rounded-lg', positionCn)}
        />
      </Link>
      <div className="p-4 h-full lg:w-1/4 flex flex-col lg:justify-between w-full gap-4">
        <div className="flex flex-col gap-2 mt-4">
          <div className="border-b-4 border-blue-900 pb-1">
            <h2 className="font-bold text-2xl">{title}</h2>
          </div>
          <p className="text-sm text-right text-gray-500">Published at: {publishedAt.substring(0, 10)}</p>
          <IllustTags tagOrCategory={tags} />
        </div>
        <Button asChild className="w-full font-suse" variant="default">
          <Link href={`/illust/detail/${id}`} className="flex items-center gap-2 font-bold" scroll={false}>
            <ZoomIn className="w-4 h-4" />
            Detail
          </Link>
        </Button>
      </div>
    </div>
  )
}
