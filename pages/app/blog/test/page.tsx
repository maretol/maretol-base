import { getInfo } from '@/lib/api/workers'
import { FullArticle } from '@/components/large/article'

export const runtime = 'edge'

export default async function BlogArticleTestPage() {
  const contents = await getInfo()
  const testPageContent = contents.filter((c) => c.page_pathname === '/blog/test' || c.page_pathname === 'blog/test')[0]

  return (
    <div className="flex flex-col justify-center gap-10">
      <FullArticle
        id={'test'}
        title="Test"
        publishedAt={testPageContent.publishedAt}
        updatedAt={testPageContent.updatedAt}
        categories={[]}
        rawContent={testPageContent.main_text}
        parsedContents={testPageContent.parsed_content}
        tableOfContents={testPageContent.table_of_contents}
        type="blog"
        shareURL={``}
      />
    </div>
  )
}
