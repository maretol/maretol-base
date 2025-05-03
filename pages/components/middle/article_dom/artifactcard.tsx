import { Button } from '@/components/ui/button'
import { getInfo } from '@/lib/api/workers'
import { convertJST } from '@/lib/time'
import { HammerIcon } from 'lucide-react'
import Link from 'next/link'

export default async function ArtifactCard({ link }: { link: string }) {
  const linkURL = new URL(link)
  const linkPath = linkURL.pathname
  const info = await getInfo()
  const artifact = info.filter((c) => c.page_pathname === linkPath || c.page_pathname === linkPath)[0]

  return (
    <div className="flex max-w-xl">
      <Button variant={'outline'} className="no-underline bg-gray-300 h-full w-full" asChild>
        <Link href={linkPath}>
          <HammerIcon className="w-8 h-8 mr-2" />
          <div className="w-full flex flex-row space-x-2">
            <div className="w-full flex flex-col self-end">
              <p className="text-md text-wrap line-clamp-2">{artifact.title || 'タイトル未定義'}</p>
              <p className="text-gray-500 text-xs text-wrap line-clamp-2">{convertJST(artifact.publishedAt)}</p>
            </div>
          </div>
        </Link>
      </Button>
    </div>
  )
}
