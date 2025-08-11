import { ogpImageOption } from './static'

const url = 'https://www.maretol.xyz/cdn-cgi/image/#{option}/#{origin}'

export function rewriteImageURL(option: string, origin: string): string {
  return url.replace('#{option}', option).replace('#{origin}', origin)
}

export function getHeaderImageURL(): string {
  return 'https://r2.maretol.xyz/assets/maretol_base_header.png'
}

export function getOGPImageURL(imageSrc: string): string {
  return url.replace('#{option}', ogpImageOption).replace('#{origin}', imageSrc)
}

export function getDefaultOGPImageURL(): string {
  return 'https://r2.maretol.xyz/assets/maretol_base_ogp.png'
}

export function getNoImageURL() {
  return 'https://r2.maretol.xyz/assets/no_image.png'
}
