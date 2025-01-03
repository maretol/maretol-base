import ClientImage from '@/components/small/client_image'
import { Button } from '@/components/ui/button'
import { getBandeDessineeByID } from '@/lib/api/workers'
import { getNoImage, rewriteImageURL } from '@/lib/image'
import { ogpImageOption } from '@/lib/static'
import { convertJST } from '@/lib/time'
import { BandeDessineeConfig } from 'api-types'
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
    const config = (await fetch(configURL).then((res) => res.json())) as BandeDessineeConfig

    const baseURL = configURL.replaceAll('index.json', '')
    const coverURL = baseURL + config.cover

    return (
      <div className="flex max-w-xl">
        <Button variant={'outline'} className="no-underline bg-gray-300 h-full w-full" asChild>
          <Link href={linkPath}>
            <div className="w-full flex flex-row space-x-4">
              <ClientImage
                src={rewriteImageURL(ogpImageOption, coverURL)}
                alt=""
                width={300}
                height={300}
                className="max-w-36 h-auto"
              />
              <div className="w-full flex flex-col space-y-3">
                <div>
                  <p className="text-xl text-wrap line-clamp-2">{title}</p>
                  <p className="text-gray-500 text-xs text-wrap line-clamp-2">{publishedAt}</p>
                </div>
                <div>
                  <p>ジャンル : {tag}</p>
                  <p>シリーズ : {series}</p>
                </div>
                <div>
                  <p className="text-wrap line-clamp-2">{shortDescription}</p>
                </div>
                <div className="h-full flex flex-row items-end justify-end">
                  <Button className="w-full h-8 bg-gray-800">Read this</Button>
                </div>
              </div>
            </div>
          </Link>
        </Button>
      </div>
    )
  } catch (e) {
    console.log(e)
    const noImage = getNoImage()
    const title = 'エラー：見つかりませんでした'
    const publishedAt = '0000/00/00 00:00:00 JST'
    return (
      <div className="flex max-w-xl">
        <Button variant={'outline'} className="no-underline bg-gray-300 h-full w-full">
          <div className="w-full flex flex-row space-x-4">
            <ClientImage src={noImage} alt="" width={300} height={300} className="max-w-36 h-auto" />
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
