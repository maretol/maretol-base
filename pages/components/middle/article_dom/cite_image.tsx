import Image from 'next/image'
import fetchCiteImage from '@/lib/api/cite_image'
import { getNoImageURL } from '@/lib/image'
import Link from 'next/link'

interface CiteImageProps {
  url: string
  source: string
  caption?: string
  sourceTitle?: string
  articleID: string
}

export default async function CiteImage({ url, source, caption, sourceTitle, articleID }: CiteImageProps) {
  const result = await fetchCiteImage(url)

  const imageSrc = result.success && result.data ? result.data : getNoImageURL()
  const isDataUrl = imageSrc.startsWith('data:')

  // モーダル用のbase64エンコード（URL-safe）
  const base64src = btoa(url).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const linkText = sourceTitle ? `引用元 : ${sourceTitle}` : '引用元'

  const imageElement = (
    <Image
      src={imageSrc}
      alt={caption || '引用画像'}
      width={300}
      height={400}
      unoptimized={isDataUrl}
      className="w-full h-auto object-contain shadow-xl"
    />
  )

  return (
    <div className="bg-gray-200 p-3 rounded-lg border-l-8 border-l-gray-500 w-fit mx-3 max-w-xl" id={base64src}>
      {isDataUrl ? (
        <Link href={`/blog/${articleID}/image/${base64src}`} className="x-blog-image" scroll={false}>
          {imageElement}
        </Link>
      ) : (
        imageElement
      )}
      <blockquote>
        <div className="mt-3 text-center">
          <p className="text-sm text-gray-800">
            {caption && <span>{caption}　</span>}
            {!isDataUrl && <span>引用元の画像にアクセスできませんでした</span>}
          </p>
          <p className="text-sm text-gray-800">
            <Link href={source} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {linkText}
            </Link>
          </p>
        </div>
      </blockquote>
    </div>
  )
}
