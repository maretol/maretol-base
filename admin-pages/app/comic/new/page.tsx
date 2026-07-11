import { listComicTags, listComicSeries } from '@/lib/db_comic'
import { ComicForm } from '../comic-form'

export const dynamic = 'force-dynamic'

export default async function NewComic({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; preview?: string }>
}) {
  const { error, preview } = await searchParams
  const [allTags, allSeries] = await Promise.all([listComicTags(), listComicSeries()])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">マンガ新規作成</h1>
      <ComicForm mode="new" allTags={allTags} allSeries={allSeries} error={error} previewURL={preview} />
    </div>
  )
}
