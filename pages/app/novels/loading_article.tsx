import { LoadingNovels } from '@/components/large/loading_novels'

export default function LoadingNovelsPage() {
  // 1-5のリスト
  const list = Array.from({ length: 5 }, (_, i) => i + 1)

  return (
    <div className="flex flex-col justify-center gap-10">
      {list.map((_, i) => (
        <LoadingNovels key={i} />
      ))}
    </div>
  )
}
