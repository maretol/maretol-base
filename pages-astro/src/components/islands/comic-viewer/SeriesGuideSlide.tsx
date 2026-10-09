import { memo } from 'react'
import { ChevronLeftIcon } from 'lucide-react'
import { comicPath, comicSeriesPath } from '@/lib/comic'
import type { SeriesGuide } from './types'

// class は現行サイトの shadcn/ui の Button（secondary / link）と同じ
// （tailwind-merge をブラウザへ持ち込まないよう、結合済みの文字列で持つ）
const buttonBaseClassName =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-10 px-4 py-2'
const nextButtonClassName = `${buttonBaseClassName} bg-secondary text-secondary-foreground hover:bg-secondary/80 w-48`
const seriesLinkClassName = `${buttonBaseClassName} underline-offset-4 hover:underline text-gray-300`

type Props = {
  guide: SeriesGuide
  // スライドが表示中（Swiper のアクティブスライド）か
  isActive: boolean
}

// 本編の末尾に表示する案内。次の話があれば「次の話へ」、なければ「現在の最新話」を案内する
// 次の話への遷移は、このスライドの表示中にもう一度ページ送り操作をしたときにも行う（ComicViewer 側で処理）
function SeriesGuideSlide({ guide, isActive }: Props) {
  // 親の comic-zone にクリック位置によるページ送りがあるため、リンクのクリックは伝播させない
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation()

  return (
    // 非表示中は inert で操作対象から外す。Tab で画面外のリンクにフォーカスが移ると、
    // overflow:hidden の Swiper コンテナがスクロールされて Swiper の表示位置とずれてしまうため
    <div inert={!isActive} className="flex flex-col justify-center items-center h-full w-full gap-4 text-gray-300">
      {guide.nextID !== null ? (
        <>
          <ChevronLeftIcon className="size-8" aria-hidden="true" />
          <p className="text-lg">次の話へ</p>
          <p className="text-sm text-gray-400">もう一度ページを送ると次の話に移動します</p>
          <a href={comicPath(guide.nextID)} className={nextButtonClassName} onClick={stopPropagation}>
            次の話を読む
          </a>
        </>
      ) : (
        <p className="text-lg">現在の最新話です</p>
      )}
      <a href={comicSeriesPath(guide.seriesID)} className={seriesLinkClassName} onClick={stopPropagation}>
        シリーズ一覧へ
      </a>
    </div>
  )
}

export default memo(SeriesGuideSlide)
