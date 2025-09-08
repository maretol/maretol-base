import ClientImage2 from '@/components/small/client_image2'
import { getNoImageURL } from '@/lib/image'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function NofetchLinkCard({
  url,
  title,
  description,
}: {
  url?: string
  title?: string
  description?: string
}) {
  const hasURL = url !== undefined && url !== ''
  const href = url || '#'

  if (!title) {
    title = 'No Title'
  }
  if (!description) {
    description = 'No Description'
  }
  if (!hasURL) {
    title = 'リンク指定のURLがありません'
    description = 'リンクカードを表示するには、URLを指定してください。'
    url = '---URL is not specified---'
  }

  return (
    <div className="max-w-2xl no-underline border-2 border-gray-300 rounded-[9px]">
      <Link
        href={href}
        target={hasURL ? '_blank' : undefined}
        className={cn('no-underline hover:underline')}
        rel={hasURL ? 'noopener noreferrer' : undefined}
      >
        <div className="flex flex-row h-24">
          <div className="row-span-3 w-36 h-24">
            <ClientImage2
              src={getNoImageURL()}
              alt="No Image"
              width={50}
              height={50}
              className="object-contain w-36 h-24"
            />
          </div>
          <div className="col-span-2 w-96 flex-auto ml-2 mr-1">
            <p className="text-lg line-clamp-1 font-semibold pt-1">{title}</p>
            <p className="text-sm line-clamp-3">{description}</p>
          </div>
        </div>
        <div className="p-1 bg-gray-300 rounded-b-[6px]">
          <p className="no-underline text-sm line-clamp-1">{title}</p>
          <p className="no-underline text-sm line-clamp-1">{url}</p>
        </div>
      </Link>
    </div>
  )
}
