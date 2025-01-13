'use client'

import Image from 'next/image'
import { PlaceholderImageBase64 } from './placeholder'

export default function ComicImage({
  src,
  alt,
  priority,
  loading,
  className,
}: {
  src: string
  alt: string
  priority?: boolean
  loading?: 'lazy' | 'eager'
  className?: string
}) {
  const imageLoader = ({ src }: { src: string }) => {
    const url = 'https://www.maretol.xyz/cdn-cgi/image/#{option}/#{origin}'
    return url.replace('#{option}', 'format=auto').replace('#{origin}', src)
  }

  return (
    <Image
      loader={imageLoader}
      src={src}
      width={500}
      height={1000}
      priority={priority}
      loading={loading}
      alt={alt}
      className={className}
      placeholder={`data:image/png;base64,${PlaceholderImageBase64}`}
    />
  )
}
