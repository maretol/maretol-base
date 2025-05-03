import { getNodeEnv } from './env'
import { originImageOption } from './static'

const url = 'https://www.maretol.xyz/cdn-cgi/image/#{option}/#{origin}'

export function rewriteImageURL(option: string, origin: string): string {
  return url.replace('#{option}', option).replace('#{origin}', origin)
}

export function getHeaderImage() {
  const prdHeaderImage = rewriteImageURL(originImageOption, 'https://r2.maretol.xyz/assets/maretol_base_header.png')
  const headerImage = getNodeEnv() === 'production' ? prdHeaderImage : '/image/maretol_base.png'
  return headerImage
}

export function getOGPImage() {
  return rewriteImageURL(originImageOption, 'https://r2.maretol.xyz/assets/maretol_base_ogp.png')
}

export function getNoImage() {
  return rewriteImageURL(originImageOption, 'https://r2.maretol.xyz/assets/no_image.png')
}
