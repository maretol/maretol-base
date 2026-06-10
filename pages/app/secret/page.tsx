import { getInfo } from '@/lib/api/workers'
import { FullArticle } from '@/components/large/article'
import { metadata } from '../layout'
import { getHostname } from '@/lib/env'

export const dynamic = 'force-dynamic'

export function generateMetadata() {
  return {
    title: 'Secret | Maretol Base',
    description: 'Secret',
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      ...metadata.openGraph,
      title: 'Secret | Maretol Base',
      description: 'Secret',
      url: getHostname() + '/secret',
    },
  }
}

export default async function Secret() {
  const contents = await getInfo()

  const secretPageContents = contents.filter((c) => c.page_pathname === '/secret' || c.page_pathname === 'secret')[0]

  const host = getHostname()
  const path = '/secret'
  const url = `${host}${path}`

  return (
    <div className="flex flex-col justify-center gap-10">
      <FullArticle
        id={'secret'}
        title="Secret"
        publishedAt={secretPageContents.publishedAt}
        updatedAt={secretPageContents.updatedAt}
        categories={[]}
        parsedContents={secretPageContents.parsed_content}
        tableOfContents={secretPageContents.table_of_contents}
        type="info"
        shareURL={url}
        annotations={secretPageContents.annotations}
      />
    </div>
  )
}
