import { rewriteImageURL } from '@/lib/image'
import { imageOption } from '@/lib/static'
import ClientImage from '../../small/client_image'
import Link from 'next/link'

export default function ContentImage({ tag, src, articleID }: { tag: string; src: string; articleID: string }) {
  const imageSrc = rewriteImageURL(imageOption, src)
  // originのsrcをbase64に変換する
  const base64src = Buffer.from(src).toString('base64')

  if (tag === 'content_image') {
    return (
      // ここに画像のモーダルを実装する
      <div className="w-fit">
        <Link href={`/blog/${articleID}/image/${base64src}`} passHref>
          <ClientImage src={imageSrc} alt="" width={300} height={400} className="inner-image" />
        </Link>
      </div>
    )
  } else if (tag === 'content_comic') {
    // 将来実装予定
    return <p>{src}</p>
  } else {
    // 本来ないはずだけどなにか来たとき
    return <p>{src}</p>
  }
}
