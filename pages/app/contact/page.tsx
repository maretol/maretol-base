import { getInfo } from '@/lib/api/workers'
import { FullArticle } from '@/components/large/article'
import { metadata } from '../layout'
import { getHostname } from '@/lib/env'

export const runtime = 'edge'

export function generateMetadata() {
  return {
    title: '連絡先 | Maretol Base',
    description: '連絡先ページ',
    openGraph: {
      ...metadata.openGraph,
      title: '連絡先 | Maretol Base',
      description: '連絡先ページ',
      url: getHostname() + '/contact',
    },
  }
}

export default async function ContactPage() {
  const contents = await getInfo()

  const contactPageContents = contents.filter((c) => c.page_pathname === '/contact' || c.page_pathname === 'contact')[0]

  const host = getHostname()
  const path = '/contact'
  const url = `${host}${path}`

  return (
    <div className="flex flex-col justify-center gap-10">
      <FullArticle
        id={'contact'}
        title="連絡先"
        publishedAt={contactPageContents.publishedAt}
        updatedAt={contactPageContents.updatedAt}
        categories={[]}
        rawContent={contactPageContents.main_text}
        parsedContents={contactPageContents.parsed_content}
        type="info"
        shareURL={url}
      />
    </div>
  )
}
