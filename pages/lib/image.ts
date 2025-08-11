import { originImageOption } from './static'

const url = 'https://www.maretol.xyz/cdn-cgi/image/#{option}/#{origin}'

export function rewriteImageURL(option: string, origin: string): string {
  return url.replace('#{option}', option).replace('#{origin}', origin)
}

export function getHeaderImageURL(): string {
  return 'https://r2.maretol.xyz/assets/maretol_base_header.png'
}

export function getOGPImage() {
  return rewriteImageURL(originImageOption, 'https://r2.maretol.xyz/assets/maretol_base_ogp.png')
}

export function getNoImageURL() {
  return 'https://r2.maretol.xyz/assets/no_image.png'
}
