import { getInfo } from '@/lib/api/workers'
import { FullArticle } from '@/lib/components/large/article'

export const runtime = 'edge'

export default async function BlogArticleTestPage() {
  const contents = await getInfo()
  const testPageContent = contents.filter((c) => c.page_pathname === '/blog/test' || c.page_pathname === 'blog/test')[0]

  return (
    <div className="flex flex-col justify-center gap-10">
      <FullArticle
        id={'test'}
        title="Test"
        createdAt={testPageContent.createdAt}
        updatedAt={testPageContent.updatedAt}
        categories={[]}
        rawContent={testPageContent.main_text}
        parsedContents={testPageContent.parsed_content}
        type="blog"
        shareURL={``}
      />
    </div>
  )
}
