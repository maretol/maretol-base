import ClientImage2 from '@/components/small/client_image2'
import { Button } from '@/components/ui/button'
import { getBandeDessineeByID } from '@/lib/api/workers'
import { getNoImageURL } from '@/lib/image'
import { convertJST } from '@/lib/time'
import Link from 'next/link'

export default async function ComicPageCard({ link }: { link: string }) {
  const linkURL = new URL(link)
  const linkPath = linkURL.pathname
  const bandeDessineeId = linkPath.split('/')[2]

  try {
    const data = await getBandeDessineeByID(bandeDessineeId)

    const title = data.title_name
    const publishedAt = convertJST(data.publishedAt)
    const tag = data.tag.tag_name
    const series = data.series?.series_name || '-'
    const shortDescription = data.parsed_description[0].text
    const configURL = data.contents_url

    const baseURL = configURL.replaceAll('index.json', '')
    const sumnailImage = data.cover || data.filename + '_00' + data.first_page + data.format[0]
    const coverURL = baseURL + sumnailImage

    return (
      <div className="max-w-2xl">
        <div className="bg-gray-300 h-full w-full px-4 py-2 rounded-md font-semibold">
          <div className="w-full flex flex-row space-x-4">
            <ClientImage2
              src={coverURL}
              alt=""
              width={300}
              height={300}
              format="auto"
              className="w-1/3 h-56 object-contain rounded-sm bg-gray-400"
            />
            <div className="w-2/3 flex flex-col space-y-3">
              <div>
                <p className="text-xl text-wrap line-clamp-2">{title}</p>
                <p className="text-gray-500 text-xs text-wrap line-clamp-2">{publishedAt}</p>
              </div>
              <div className="font-medium text-sm">
                <p>ジャンル : {tag}</p>
                <p>シリーズ : {series}</p>
              </div>
              <div className="font-medium text-sm">
                <p className="text-wrap line-clamp-2">{shortDescription}</p>
              </div>
              <div className="h-full flex flex-row items-end justify-end">
                <Button className="w-full h-8 rounded-md flex items-center justify-center font-semibold" asChild>
                  <Link href={linkPath}>Read this</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  } catch (e) {
    console.error('[components/middle/article_dom/comiccard.tsx:62] Comic fetch error:', e)
    const noImage = getNoImageURL()
    const title = 'エラー：見つかりませんでした'
    const publishedAt = '0000/00/00 00:00:00 JST'
    return (
      <div className="flex max-w-xl">
        <Button variant={'outline'} className="no-underline bg-gray-300 h-full w-full">
          <div className="w-full flex flex-row space-x-4">
            <ClientImage2 src={noImage} alt="" width={300} height={300} className="max-w-36 h-auto" />
            <div className="w-full space-y-3 text-left">
              <div>
                <p className="text-xl text-wrap line-clamp-2">{title}</p>
                <p className="text-gray-500 text-xs text-wrap line-clamp-2">{publishedAt}</p>
              </div>
              <div>
                <p>ジャンル : -</p>
                <p>シリーズ : -</p>
              </div>
              <div>
                <p>公開が停止されたか、リンクのURLを間違えたようです</p>
              </div>
            </div>
          </div>
        </Button>
      </div>
    )
  }
}
