'use client'

import Image from 'next/image'

export default function ComicImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const imageLoader = ({ src }: { src: string }) => {
    const url = 'https://www.maretol.xyz/cdn-cgi/image/#{option}/#{origin}'
    return url.replace('#{option}', 'format=auto').replace('#{origin}', src)
  }

  return <Image loader={imageLoader} src={src} width={500} height={1000} priority alt={alt} className={className} />
}
