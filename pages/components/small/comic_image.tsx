'use client'

import Image from 'next/image'
import { PlaceholderImageBase64 } from './placeholder'

export default function ComicImage({
  src,
  alt,
  loading,
  className,
}: {
  src: string
  alt: string
  loading?: 'lazy' | 'eager'
  className?: string
}) {
  const imageLoader = ({ src, width, quority }: { src: string; width?: number; quority?: number }) => {
    const option = `w=${width},q=${quority},f=webp`
    return `https://www.maretol.xyz/cdn-cgi/image/${option}/${src}`
  }

  return (
    <Image
      loader={imageLoader}
      src={src}
      width={3000}
      height={3000}
      quality={100}
      loading={loading}
      alt={alt}
      className={className}
      placeholder={`data:image/png;base64,${PlaceholderImageBase64}`}
    />
  )
}
