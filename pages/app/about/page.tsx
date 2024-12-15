import { getInfo } from '@/lib/api/workers'
import { FullArticle } from '@/components/large/article'
import { metadata } from '../layout'
import { getHostname } from '@/lib/env'

export const runtime = 'edge'

export function generateMetadata() {
  return {
    title: 'このサイトについて | Maretol Base',
    description: 'このサイトについて',
    openGraph: {
      ...metadata.openGraph,
      title: 'このサイトについて | Maretol Base',
      description: 'このサイトについて',
      url: getHostname() + '/about',
    },
  }
}

export default async function About() {
  const contents = await getInfo()

  const aboutPageContents = contents.filter((c) => c.page_pathname === '/about' || c.page_pathname === 'about')[0]

  const host = getHostname()
  const path = '/about'
  const url = `${host}${path}`

  return (
    <div className="flex flex-col justify-center gap-10">
      <FullArticle
        id={'about'}
        title="このページについて"
        publishedAt={aboutPageContents.publishedAt}
        updatedAt={aboutPageContents.updatedAt}
        categories={[]}
        rawContent={''}
        parsedContents={aboutPageContents.parsed_content}
        tableOfContents={aboutPageContents.table_of_contents}
        type="info"
        shareURL={url}
      />
    </div>
  )
}
