import { useCallback, useState } from 'react'
import { COMIC_MODE_THRESHOLD } from '@/lib/comic'
import { getTransformedImageURL } from '@/lib/image'

// 漫画のページの画像（astro_design.md 5 章の「画像」）
// - 派生画像の幅は固定の候補から選ぶ。表示の大きさは高さで決まるので、幅の候補は 3 つに絞る
// - 読み込みに失敗したら取り直す。派生画像の組 → 1 つの派生画像 → 原本の順に試し、最後まで失敗したら諦める
// - 読み込みの成否は親に知らせる（順次先読みの判定に使う）
const WIDTHS = [828, 1200, 1920]
const QUALITY = 100
const RETRY_DELAY = 1000
const LAST_ATTEMPT = 2
// srcset の候補を選ぶための表示幅。画像は高さいっぱいに出すので、幅は画面の幅に対する目安（見開きは半分）。
// 画面の幅で見開きかどうかが決まる（ComicViewer.tsx の wideQuery）ので、同じ条件のメディアクエリで書く。
// サーバーとブラウザで同じ値になるので、hydration の前後で別の候補を取り直すことがない
const SIZES = `(min-width: ${COMIC_MODE_THRESHOLD}px) 50vw, 100vw`

type Props = {
  id: string
  src: string
  className: string
  onSettle: (id: string) => void
}

function sourcesFor(src: string, attempt: number): { src: string; srcSet?: string } {
  const url = (width: number) => getTransformedImageURL(src, `w=${width},q=${QUALITY},f=webp`)
  if (attempt === 0) {
    return { src: url(1200), srcSet: WIDTHS.map((width) => `${url(width)} ${width}w`).join(', ') }
  }
  if (attempt === 1) {
    return { src: url(1200) }
  }
  return { src }
}

export default function ComicImage({ id, src, className, onSettle }: Props) {
  const [attempt, setAttempt] = useState(0)
  const sources = sourcesFor(src, attempt)

  // サーバーで描画した画像は hydration の前に読み込みが終わっていることがあり、その場合 onLoad は呼ばれない。
  // 取り付け時に読み込み済みなら、ここで知らせる
  const ref = useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth > 0) {
        onSettle(id)
      }
    },
    [id, onSettle],
  )

  return (
    // 取り直しのたびに要素を作り直す（同じ URL でも読み込みをやり直させる）
    <img
      key={attempt}
      ref={ref}
      src={sources.src}
      srcSet={sources.srcSet}
      sizes={sources.srcSet ? SIZES : undefined}
      alt=""
      decoding="async"
      className={className}
      onLoad={() => onSettle(id)}
      onError={() => {
        if (attempt < LAST_ATTEMPT) {
          setTimeout(() => setAttempt(attempt + 1), RETRY_DELAY)
        } else {
          console.error('[comic-viewer/ComicImage.tsx] failed to load', src)
          onSettle(id)
        }
      }}
    />
  )
}
