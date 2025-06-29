import { contentsAPIResult } from 'api-types'
import SidebarContentFrame from '../sidebar_content'
import Link from 'next/link'
import { convertJST } from '@/lib/time'

type articles = {
  image: string | null
  title: string
  publishedAt: string
  id: string
}

export default async function ArticlesSidebar({ articles }: { articles: contentsAPIResult[] }) {
  const articlesData: articles[] = articles.map((article) => ({
    image: article.ogp_image || null,
    title: article.title,
    publishedAt: article.publishedAt,
    id: article.id,
  }))

  return (
    <SidebarContentFrame title="Latest Articles">
      <div>
        {articlesData.map((article) => (
          <ArticleLink
            key={article.id}
            id={article.id}
            title={article.title}
            publishedAt={article.publishedAt}
            image={article.image}
          />
        ))}
      </div>
    </SidebarContentFrame>
  )
}

function ArticleLink({ id, title, publishedAt, image }: articles) {
  return (
    <div className="mb-4">
      <Link href={`/blog/${id}`} className="hover:underline">
        <p className="">{title}</p>
        <p className="text-gray-500">{convertJST(publishedAt)}</p>
      </Link>
    </div>
  )
}
