import { getAtelierByID } from '@/lib/api/workers'
import DrawerPage from './drawer'

export default async function ImageDrawer(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const id = params.id

  const atelier = await getAtelierByID(id)
  if (!atelier) {
    // TODO: ちゃんと404ページを作る
    return <div>Atelier not found</div>
  }

  const title = atelier.title
  const description = atelier.parsed_description
  const imageSrc = atelier.src

  return <DrawerPage title={title} imageSrc={imageSrc} description={description} />
}
