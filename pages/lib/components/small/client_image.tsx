'use client'

import Image from 'next/image'

// 画像をクライアントからNext.jsのサーバを経由しないで取りに行くコンポーネント
// こちらのほうがCDNの最適化の恩恵を受けることができるため、Imageはこちらを使う
export default function ClientImage({
  src,
  alt,
  width,
  height,
  className,
}: {
  src: string
  alt: string
  width: number
  height: number
  className?: string
}) {
  const imageLoader = ({ src }: { src: string }) => {
    return `${src}`
  }

  return <Image loader={imageLoader} src={src} unoptimized={true} alt={alt} width={width} height={height} className={className} />
}
