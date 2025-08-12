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
  const articlethumbnail = linkArticle.ogp_image

  // サムネあり版
  if (articlethumbnail) {
    return (
      <div className="max-w-2xl">
        <div className="bg-gray-300 h-full w-full px-4 py-2 rounded-md">
          <div className="w-full flex flex-row space-x-4">
            <ClientImage2
              src={articlethumbnail}
              alt=""
              width={300}
              height={300}
              className="w-1/3 h-24 object-full rounded-md object-center"
            />
            <div className="flex flex-col items-end justify-end w-2/3 gap-2">
              <div className="w-full flex flex-row items-end">
                <div className="flex items-center gap-2">
                  <NotebookText className="w-6 h-6" />
                  <div className="w-full flex flex-col self-end">
                    <p className="text-md font-semibold text-wrap line-clamp-2">{articleTitle}</p>
                    <p className="text-gray-500 text-xs text-wrap line-clamp-2">{convertJST(articlePublishedAt)}</p>
                  </div>
                </div>
              </div>
              <Button className="w-full h-8" asChild>
                <Link href={linkPath}>Read this</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // サムネなし版
  return (
    <div className="max-w-2xl">
      <div className="bg-gray-300 h-full w-full px-4 py-2 rounded-md">
        <div className="flex items-center gap-2">
          <NotebookText className="w-6 h-6" />
          <div className="w-full flex flex-col self-end">
            <p className="text-md font-semibold text-wrap line-clamp-2">{articleTitle}</p>
            <p className="text-gray-500 text-xs text-wrap line-clamp-2">{convertJST(articlePublishedAt)}</p>
          </div>
          <div>
            <Button className="h-8" asChild>
              <Link href={linkPath}>Read this</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
