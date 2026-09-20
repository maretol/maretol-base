import { memo } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { comicPath, comicSeriesPath } from '@/lib/comic_util'
import { SeriesGuide } from './types'

type SeriesGuideSlideProps = {
  guide: SeriesGuide
  isActive: boolean // スライドが表示中（Swiperのアクティブスライド）か
}

// 本編の末尾に表示する案内。次の話があれば「次の話へ」、なければ「現在の最新話」を案内する
// 次の話への遷移は、このスライドの表示中にもう一度ページ送り操作をしたときにも行う（ComicBook側で処理）
function SeriesGuideSlide(props: SeriesGuideSlideProps) {
  const { guide, isActive } = props

  // 親のcomic-zoneにクリック位置によるページ送り（useZoneDetection）があるため、リンクのクリックは伝播させない
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation()

  return (
    // 非表示中はinertで操作対象から外す。Tabで画面外のリンクにフォーカスが移ると、
    // overflow:hiddenのSwiperコンテナがスクロールされてSwiperの表示位置とずれてしまうため
    <div inert={!isActive} className="flex flex-col justify-center items-center h-full w-full gap-4 text-gray-300">
      {guide.nextId !== null ? (
        <>
          <ChevronLeftIcon className="size-8" aria-hidden="true" />
          <p className="text-lg">次の話へ</p>
          <p className="text-sm text-gray-400">もう一度ページを送ると次の話に移動します</p>
          <Button variant="secondary" className="w-48" asChild>
            <Link href={comicPath(guide.nextId)} onClick={stopPropagation}>
              次の話を読む
            </Link>
          </Button>
        </>
      ) : (
        <p className="text-lg">現在の最新話です</p>
      )}
      <Button variant="link" className="text-gray-300" asChild>
        <Link href={comicSeriesPath(guide.seriesId)} onClick={stopPropagation}>
          シリーズ一覧へ
        </Link>
      </Button>
    </div>
  )
}

export default memo(SeriesGuideSlide)
