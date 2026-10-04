// 画像 URL の組み立て。派生画像は Cloudflare Images の /cdn-cgi/image/ で作る

const IMAGE_HOST = 'https://www.maretol.xyz'

// OGP 画像のオプション
const ogpImageOption = 'w=1200,h=630,f=webp,q=70'

export type ImageFormat = 'auto' | 'webp' | 'jpeg' | 'avif'

export function getTransformedImageURL(src: string, option: string): string {
  return `${IMAGE_HOST}/cdn-cgi/image/${option}/${src}`
}

export function getHeaderImageURL(): string {
  return 'https://r2.maretol.xyz/assets/maretol_base_header.png'
}

export function getOGPImageURL(imageSrc: string): string {
  return getTransformedImageURL(imageSrc, ogpImageOption)
}

export function getDefaultOGPImageURL(): string {
  return 'https://r2.maretol.xyz/assets/maretol_base_ogp.png'
}

export function getNoImageURL(): string {
  return 'https://r2.maretol.xyz/assets/no_image.png'
}

// 派生画像の幅の候補。任意の幅を作らず、この中から選ぶ（変換数を増やさないため）
const WIDTHS = [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]

// 画面上で表示されうる最大の幅（CSS px）。本文カラムの最大幅より少し大きい値
const MAX_DISPLAY_WIDTH = 1280

function pickWidth(width: number): number {
  return WIDTHS.find((candidate) => candidate >= width) ?? WIDTHS[WIDTHS.length - 1]
}

type ImageSourceOptions = {
  quality?: number
  format?: ImageFormat
  // 表示幅の上限（CSS px）。これより大きい派生は要求しない
  maxDisplayWidth?: number
  // 原本の幅が分かっているとき。原本より大きい派生は同じ画像になるので要求しない
  sourceWidth?: number
}

// 1x / 2x の srcset と、フォールバックの src を返す。
// 2x の候補が 1x と同じ URL になっても省かない（画面の密度ごとの表示サイズを変えないため）
export function getImageSources(
  src: string,
  width: number,
  {
    quality = 80,
    format = 'webp',
    maxDisplayWidth = MAX_DISPLAY_WIDTH,
    sourceWidth = Infinity,
  }: ImageSourceOptions = {},
): { src: string; srcset: string } {
  const widths = [
    pickWidth(Math.min(width, maxDisplayWidth)),
    pickWidth(Math.min(width * 2, maxDisplayWidth * 2, sourceWidth)),
  ]
  const urls = widths.map((w) => getTransformedImageURL(src, `w=${w},q=${quality},f=${format}`))
  return {
    src: urls[1],
    srcset: `${urls[0]} 1x, ${urls[1]} 2x`,
  }
}

// 記事画像の URL から、ページ内アンカーとモーダルの URL に使う base64url を作る
export function toBase64URL(src: string): string {
  return btoa(src).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
