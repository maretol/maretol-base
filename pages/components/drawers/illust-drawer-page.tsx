import { getAtelierByID } from '@/lib/api/workers'
import IllustDrawerClient from './illust-drawer-client'
import { convertJST } from '@/lib/time'
import IllustTags from '@/components/middle/illust_tags'
import IllustDescription from '@/components/middle/illust_description'
import { getHostname } from '@/lib/env'

export default async function IllustDrawerPage({ id, draftKey }: { id: string; draftKey?: string }) {
  const atelier = await getAtelierByID(id, draftKey)
  if (!atelier) {
    return <div>Atelier not found</div>
  }

  const title = atelier.title
  const description = atelier.parsed_description
  const tagOrCategory = atelier.tag_or_category
  const tableOfContents = atelier.table_of_contents
  const imageSrc = atelier.src
  const publishedAt = convertJST(atelier.publishedAt)
  const shareURL = `${getHostname()}/illust/detail/${id}`

  return (
    <IllustDrawerClient title={title} shareURL={shareURL} imageSrc={imageSrc} publishedAt={publishedAt}>
      <div className="px-4">
        <IllustTags tagOrCategory={tagOrCategory} />
      </div>
      <IllustDescription description={description} tableOfContents={tableOfContents} />
    </IllustDrawerClient>
  )
}
