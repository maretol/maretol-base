import { LoadingIllustSample } from '@/components/large/loading_illust_sample'

export default function LoadingIllustPage() {
  const list = Array.from({ length: 5 }, (_, i) => i + 1)

  return (
    <div className="flex flex-col justify-center gap-10">
      {list.map((_, i) => (
        <LoadingIllustSample key={i} />
      ))}
    </div>
  )
}
