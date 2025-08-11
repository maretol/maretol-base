import ClientImage2 from '@/components/small/client_image2'
import { Button } from '@/components/ui/button'
import { getCMSContent } from '@/lib/api/workers'
import { convertJST } from '@/lib/time'
import { NotebookText } from 'lucide-react'
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
    <div className="flex max-w-2xl">
      <Button variant={'outline'} className="no-underline bg-gray-300 h-full w-full" asChild>
        <Link href={linkPath}>
          <div className="w-full flex flex-row space-x-2">
            {articleSumnail && (
              <ClientImage2
                src={articleSumnail}
                alt=""
                width={300}
                height={300}
                className="w-full max-w-36 h-auto object-contain"
              />
            )}
            {!articleSumnail && (
              <div className="max-w-36 h-auto flex items-center justify-center">
                <NotebookText className="w-6 h-6" />
              </div>
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
