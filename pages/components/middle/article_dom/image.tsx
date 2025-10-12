import Link from 'next/link'
import fetchBlurredImage from '@/lib/api/image'
import { cn } from '@/lib/utils'
import ClientImage2 from '@/components/small/client_image2'

export default async function ContentImage({
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
  // originのsrcをbase64URLencodingに変換する
  const base64src = btoa(src).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const caption = subText?.caption
  const title = subText?.title

  const blurData = await fetchBlurredImage(src)

  if (tag === 'content_image') {
    return (
      // ここに画像のモーダルを実装する
      <div className="w-fit mx-3" id={base64src}>
        <Link href={`/blog/${articleID}/image/${base64src}`} passHref className="x-blog-image" scroll={false}>
          <ClientImage2
            src={src}
            alt=""
            width={300}
            height={400}
            blurData={blurData}
            className="w-full h-auto object-contain shadow-xl inner-image rounded-2xl"
          />
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
      <div className={cn('bg-indigo-200 p-2 rounded-xs w-full max-w-xl mx-3')} id={base64src}>
        <Link href={`/blog/${articleID}/image/${base64src}`} passHref className="x-blog-image" scroll={false}>
          <ClientImage2
            src={src}
            alt=""
            width={400}
            height={400}
            blurData={blurData}
            className="w-full h-auto shadow-xl object-contain inner-image rounded-2xl"
          />
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
