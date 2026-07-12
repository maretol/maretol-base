import { notFound } from 'next/navigation'
import { getBandeDessinee, listComicTags, listComicSeries } from '@/lib/db_comic'
import { ComicForm } from '../../comic-form'

export const dynamic = 'force-dynamic'

export default async function EditComic({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; saved?: string }>
}) {
  const { id } = await params
  const { error, saved } = await searchParams

  const comic = await getBandeDessinee(id)
  if (!comic) {
    notFound()
  }
  const [allTags, allSeries] = await Promise.all([listComicTags(), listComicSeries()])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">マンガ編集: {comic.title_name}</h1>
      <ComicForm
        mode="edit"
        comic={comic}
        allTags={allTags}
        allSeries={allSeries}
        error={error}
        saved={saved === '1'}
      />
    </div>
  )
}
