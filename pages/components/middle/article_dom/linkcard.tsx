import { rewriteImageURL } from '@/lib/image'
import { originImageOption } from '@/lib/static'
import ClientImage from '@/components/small/client_image'
import { getOGPData } from '@/lib/api/workers'
import Link from 'next/link'

export default async function LinkCard({ link }: { link: string }) {
  const headerTitle = 'No Page Title'
  let ogpTitle = ''
  let ogpDescription = ''
  let ogpImage = ''
  let ogpUrl = ''
  let ogpSite = ''

  let title = ''
  let image = ''
  let site = ''

  try {
    const linkResult = await getOGPData(link)

    if (linkResult.success) {
      ogpTitle = linkResult.og_title
      ogpDescription = linkResult.og_description
      ogpImage = linkResult.og_image !== '' ? linkResult.og_image : getNoImage()
      ogpUrl = linkResult.og_url !== '' ? linkResult.og_url : link
      ogpSite = linkResult.og_site_name
    } else {
      ogpTitle = 'Missing data fetching'
      ogpDescription = 'リンク先の情報取得でエラーが発生しました。リンクは機能しています'
      ogpUrl = link
    }

    title = ogpTitle !== '' ? ogpTitle : headerTitle
    site = ogpSite !== '' ? ogpSite : title
    image = ogpImage
  } catch (e) {
    console.error(e)

    title = 'Title was not readable.'
    site = title
    image = getNoImage()
    ogpDescription = 'リンク先の情報取得でエラーが発生しました。リンクは機能しています'
  }

  return (
    <div className="max-w-xl h-100 no-underline border-2 border-gray-300 rounded-md">
      <Link href={link} target="_blank" className="no-underline hover:underline">
        <div className="flex flex-row h-24">
          <div className="row-span-3 w-36 h-24">
            <ClientImage src={image} alt={ogpTitle} width={200} height={200} className="object-contain w-36 h-24" />
          </div>
          <div className="col-span-2 w-96 flex-auto ml-2">
            <p className="text-lg line-clamp-1 font-semibold pt-1">{title}</p>
            <p className="text-sm line-clamp-3">{ogpDescription}</p>
          </div>
        </div>
        <div className="p-1 bg-gray-300 rounded-b-md">
          <p className="no-underline text-sm line-clamp-1">{site}</p>
          <p className="no-underline text-sm line-clamp-1">{ogpUrl}</p>
        </div>
      </Link>
    </div>
  )
}

function getNoImage() {
  return rewriteImageURL(originImageOption, 'https://r2.maretol.xyz/assets/no_image.png')
}
