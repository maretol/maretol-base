'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'

// client imageの改良版
// layoutとobjectFitの対応

export default function ClientImage2({
  src,
  alt,
  blurData,
  width,
  height,
  quality,
  format = 'webp',
  className,
}: {
  src: string
  alt: string
  blurData?: string
  width?: number
  height?: number
  quality?: number
  format?: 'auto' | 'webp' | 'jpeg' | 'avif'
  className?: string
}) {
  const loader = ({ src, width = 1000, quality = 80 }: { src: string; width?: number; quality?: number }) => {
    const option = `w=${width},q=${quality},f=${format}`
    return `https://www.maretol.xyz/cdn-cgi/image/${option}/${src}`
  }

  if (blurData === '') {
    blurData = undefined
  }

  return (
    <Image
      loader={loader}
      src={src}
      alt={alt}
      width={width || 1000}
      height={height || 1000}
      quality={quality}
      placeholder={blurData ? 'blur' : undefined}
      blurDataURL={blurData}
      className={cn('object-cover object-top w-full h-auto', className)}
    />
  )
}
