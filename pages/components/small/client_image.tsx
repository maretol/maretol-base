'use client'

import Image from 'next/image'

// 画像をクライアントからNext.jsのサーバを経由しないで取りに行くコンポーネント
// こちらのほうがCDNの最適化の恩恵を受けることができるため、Imageはこちらを使う
export default function ClientImage({
  src,
  alt,
  width,
  height,
  blurData,
  className,
  priority = false,
  style,
}: {
  src: string
  alt: string
  width?: number
  height?: number
  blurData?: string
  className?: string
  priority?: boolean
  style?: React.CSSProperties | undefined
}) {
  const imageLoader = ({ src }: { src: string }) => {
    return `${src}`
  }

  if (blurData !== undefined && blurData !== '') {
    return (
      <Image
        loader={imageLoader}
        src={src}
        unoptimized={true}
        alt={alt}
        width={width}
        height={height}
        className={className}
        placeholder={'blur'}
        blurDataURL={blurData}
        priority={priority}
        style={style}
      />
    )
  }

  return (
    <Image
      loader={imageLoader}
      src={src}
      unoptimized={true}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      style={style}
    />
  )
}
