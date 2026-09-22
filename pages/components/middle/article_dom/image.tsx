import AppLink from '@/components/small/app_link'
import fetchBlurredImageAndMetadata from '@/lib/api/image'
import { cn } from '@/lib/utils'
import ClientImage2 from '@/components/small/client_image2'

export default async function ContentImage({
  tag,
  src,
  subText,
  articleID,
  draftKey,
}: {
  tag: string
  src: string
  subText: { [key: string]: string } | null
  articleID: string
  draftKey?: string
}) {
  // originのsrcをbase64URLencodingに変換する
  const base64src = btoa(src).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const caption = subText?.caption
  const title = subText?.title
  // モーダル側も記事を引いて URL を照合するので、下書きプレビューでは draftKey を引き継ぐ
  const modalHref = getImageModalHref(articleID, base64src, draftKey)

  const blurImage = await fetchBlurredImageAndMetadata(src)
  const blurData = blurImage?.imageBase64
  const width = blurImage?.width
  const height = blurImage?.height

  if (tag === 'content_image') {
    return (
      // ここに画像のモーダルを実装する
      <div className="w-fit" id={base64src}>
        <AppLink href={modalHref} passHref className="x-blog-image" scroll={false}>
          <ClientImage2
            src={src}
            alt=""
            width={width}
            height={height}
            blurData={blurData}
            className="w-full h-auto object-contain shadow-xl inner-image rounded-2xl"
          />
        </AppLink>
        <div className="mt-3 space-y-1">
          {title && (
            <div className="flex justify-center">
              <p className="text-center text-md text-wrap font-bold text-gray-800 max-w-120">{title}</p>
            </div>
          )}
          {caption && (
            <div className="flex justify-center">
              <p className="text-center text-sm text-wrap text-gray-800 max-w-120">{caption}</p>
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
      <div className={cn('bg-indigo-200 p-2 rounded-xs w-full max-w-xl')} id={base64src}>
        <AppLink href={modalHref} passHref className="x-blog-image" scroll={false}>
          <ClientImage2
            src={src}
            alt=""
            width={width}
            height={height}
            blurData={blurData}
            className="w-full h-auto shadow-xl object-contain inner-image rounded-2xl"
          />
        </AppLink>
        <div className="mt-3 space-y-1">
          {caption && (
            <div className="flex justify-center">
              <p className="text-center text-sm text-wrap text-gray-800 max-w-120">{caption}</p>
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

// 画像モーダルのリンク。下書きプレビュー中は draftKey を付けて、モーダル側が下書きの記事を引けるようにする
export function getImageModalHref(articleID: string, base64src: string, draftKey?: string): string {
  const path = `/blog/${articleID}/image/${base64src}`
  return draftKey ? `${path}?draftKey=${encodeURIComponent(draftKey)}` : path
}
