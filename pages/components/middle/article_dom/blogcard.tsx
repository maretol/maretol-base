import ClientImage from '@/components/small/client_image'
import { Button } from '@/components/ui/button'
import { getCMSContent } from '@/lib/api/workers'
import { rewriteImageURL } from '@/lib/image'
import { ogpImageOption } from '@/lib/static'
import { convertJST } from '@/lib/time'
import Link from 'next/link'

export default async function BlogCard({ link }: { link: string }) {
  const linkURL = new URL(link)
  const linkPath = linkURL.pathname
  const articleID = linkPath.split('/')[2]
  const linkArticle = await getCMSContent(articleID)

  const articleTitle = linkArticle.title
  const articlePublishedAt = linkArticle.publishedAt
  const articleSumnail = linkArticle.ogp_image

  return (
    <div className="flex max-w-xl">
      <Button variant={'outline'} className="no-underline bg-gray-300 h-full w-full" asChild>
        <Link href={linkPath}>
          <div className="w-full flex flex-row space-x-2">
            {articleSumnail && (
              <ClientImage
                src={rewriteImageURL(ogpImageOption, articleSumnail)}
                alt=""
                width={300}
                height={300}
                className="max-w-36 h-auto"
              />
            )}
            <div className="w-full flex flex-col self-end">
              <p className="text-md text-wrap line-clamp-2">{articleTitle}</p>
              <p className="text-gray-500 text-xs text-wrap line-clamp-2">{convertJST(articlePublishedAt)}</p>
            </div>
          </div>
        </Link>
      </Button>
    </div>
  )
}
