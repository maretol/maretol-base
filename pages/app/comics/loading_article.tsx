import { LoadingArticle } from '@/components/large/loading_article'
import { LoadingComics } from '@/components/large/loading_comics'

export default function LoadingComicsPage() {
  // 1-5のリスト
  const list = Array.from({ length: 5 }, (_, i) => i + 1)

  return (
    <div className="flex flex-col justify-center gap-10">
      {list.map((_, i) => (
        <LoadingComics key={i} /> // マンガ一覧ページではデザインを変える可能性が高いので後で別のを用意する
      ))}
    </div>
  )
}
