import { cn } from '@/lib/utils'
import ClientImage2 from '../small/client_image2'
import { atelierTagAndCategory, ParsedContent } from 'api-types'
import { Button } from '../ui/button'
import Link from 'next/link'
import IllustTags from '../middle/illust_tags'
import { ExternalLinkIcon, ImageIcon, ZoomIn } from 'lucide-react'
import ShareButton from '../small/share'
import IllustDescription from '../middle/illust_description'
import { getHostname } from '@/lib/env'

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
            <h1 className="font-bold text-2xl">{title}</h1>
          </div>
          <p className="text-sm text-right text-gray-500">Published at: {publishedAt.substring(0, 10)}</p>
          <IllustTags tagOrCategory={tags} />
        </div>
        <Button asChild className="w-full" variant="default">
          <Link href={`/illust/detail/${id}`} className="flex items-center gap-2 font-bold" scroll={false}>
            <ZoomIn className="w-4 h-4" />
            Detail
          </Link>
        </Button>
      </div>
    </div>
  )
}

export async function OuterIllustArticle({
  id,
  title,
  imageSrc,
  tags,
  publishedAt,
  description,
}: IllustArticleProps & { description: ParsedContent[] }) {
  const shareURL = `${getHostname()}/illust/detail/${id}`
  const shareTitle = `Illustration: ${title}`

  return (
    <div className="w-full h-full rounded-b-2xl pb-1 bg-gray-100">
      <ClientImage2
        src={imageSrc}
        alt={title}
        width={1080}
        height={1080}
        quality={90}
        className={`w-full max-h-[80svh] h-auto object-contain object-center`}
      />
      <div className="flex justify-between p-2">
        <Button variant={'outline'} asChild>
          <Link
            href={`https://www.maretol.xyz/cdn-cgi/image/f=auto,q=100/${imageSrc}`}
            target={'_blank'}
            className="flex items-center gap-2"
          >
            <ExternalLinkIcon />
            Open in new tab
          </Link>
        </Button>
        <div className="flex items-center gap-2 ">
          <ShareButton variant="twitter" url={shareURL} title={shareTitle} />
          <ShareButton variant="bluesky" url={shareURL} title={shareTitle} />
          <ShareButton variant="copy_and_paste" url={shareURL} title={shareTitle} />
        </div>
      </div>
      <div className="p-4">
        <h1 className="font-bold text-3xl">{title}</h1>
        <p className="text-sm text-right text-gray-500">Published at: {publishedAt}</p>
        <IllustTags tagOrCategory={tags} />
      </div>
      <div>
        <IllustDescription description={description} />
      </div>
      <div className="flex justify-center mt-4 mb-4">
        <Button variant={'secondary'} className="w-96 flex justify-center gap-2 font-bold" asChild>
          <Link href={`/illust`}>
            <ImageIcon /> Back to illustrations page
          </Link>
        </Button>
      </div>
    </div>
  )
}
