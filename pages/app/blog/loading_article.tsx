import { LoadingArticle } from '@/components/large/loading_article'

export default function LoadingBlogPage() {
  // 1-10のリスト
  const list = Array.from({ length: 10 }, (_, i) => i + 1)

  return (
    <div className="flex flex-col justify-center gap-10">
      {list.map((_, i) => (
        <LoadingArticle key={i} />
      ))}
    </div>
  )
}
