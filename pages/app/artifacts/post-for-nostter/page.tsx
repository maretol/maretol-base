import { getHostname } from '@/lib/env'
import { getInfo } from '@/lib/api/workers'
import { FullArticle } from '@/components/large/article'

export const runtime = 'edge'

export function generateMetadata() {
  return {
    title: 'Post for nostter | Maretol Base',
    description: 'about Post for nostter',
    openGraph: {
      title: 'Post for nostter | Maretol Base',
      description: 'about Post for nostter',
      url: getHostname() + '/artifacts/post-for-nostter',
    },
  }
}

export default async function PostForNostter() {
  const contents = await getInfo()

  const postForNostterContent = contents.filter(
    (c) => c.page_pathname === '/artifacts/post-for-nostter' || c.page_pathname === 'artifacts/post-for-nostter'
  )[0]

  const host = getHostname()
  const path = '/artifacts/post-for-nostter'
  const url = `${host}${path}`

  return (
    <div className="flex flex-col justify-center gap-10">
      <FullArticle
        id={'post-for-nostter'}
        title="Post for nostter"
        publishedAt={postForNostterContent.publishedAt}
        updatedAt={postForNostterContent.updatedAt}
        categories={[]}
        parsedContents={postForNostterContent.parsed_content}
        tableOfContents={postForNostterContent.table_of_contents}
        type="info"
        shareURL={url}
      />
    </div>
  )
}
