import { rewriteImageURL } from '@/lib/image'
import { imageOption } from '@/lib/static'
import ClientImage from '../../small/client_image'
import Link from 'next/link'

export default function ContentImage({
  tag,
  src,
  subText,
  articleID,
}: {
  tag: string
  src: string
  subText: { [key: string]: string } | null
  articleID: string
}) {
  const imageSrc = rewriteImageURL(imageOption, src)
  // originのsrcをbase64に変換する
  const base64src = Buffer.from(src).toString('base64')
  const caption = subText?.caption
  const title = subText?.title

  if (tag === 'content_image') {
    return (
      // ここに画像のモーダルを実装する
      <div className="w-fit">
        <Link href={`/blog/${articleID}/image/${base64src}`} passHref className="x-blog-image">
          <ClientImage src={imageSrc} alt="" width={300} height={400} className="inner-image" />
        </Link>
        <div className="mt-3 space-y-1">
          {title && (
            <div className="flex justify-center">
              <p className="text-center text-md text-wrap font-bold text-gray-800 max-w-[30rem]">{title}</p>
            </div>
          )}
          {caption && (
            <div className="flex justify-center">
              <p className="text-center text-sm text-wrap text-gray-800 max-w-[30rem]">{caption}</p>
            </div>
          )}
        </div>
      </div>
    )
  } else if (tag === 'content_comic') {
    // 将来実装予定
    return <p>{src}</p>
  } else if (tag === 'content_photo') {
    return (
      <div className="bg-indigo-200 p-2 rounded-xs w-fit mx-3">
        <Link href={`/blog/${articleID}/image/${base64src}`} passHref className="x-blog-image">
          <ClientImage src={imageSrc} alt="" width={300} height={400} className="inner-image" />
        </Link>
        <div className="mt-3 space-y-1">
          {caption && (
            <div className="flex justify-center">
              <p className="text-center text-sm text-wrap text-gray-800 max-w-[30rem]">{caption}</p>
            </div>
          )}
        </div>
      </div>
    )
  } else {
    // 本来ないはずだけどなにか来たとき
    return <p>{src}</p>
  }
}
