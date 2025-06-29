import { categoryAPIResult, contentsAPIResult, staticAPIResult } from 'api-types'
import Profile from '../small/sidebar/profile'
import { use } from 'react'
import AboutSidebar from '../small/sidebar/about'
import IllustSidebar from '../small/sidebar/illust'
import ComicSidebar from '../small/sidebar/comic'
import ArticlesSidebar from '../small/sidebar/article'
import TagSidebar from '../small/sidebar/tags'

export default function BlogSidebar({
  staticData,
  articlesData,
  tagData,
}: {
  staticData: Promise<staticAPIResult>
  articlesData: Promise<{ contents: contentsAPIResult[] }>
  tagData: Promise<categoryAPIResult[]>
}) {
  const staticDataResult = use(staticData)
  const profile = staticDataResult.sidebar_profile
  const about = staticDataResult.sidebar_about

  const articleDataResult = use(articlesData)
  const articles = articleDataResult.contents

  const tags = use(tagData)

  return (
    <div className="w-full h-full gap-4 flex flex-col">
      <AboutSidebar rawText={about} />
      <Profile rawText={profile} />
      <ComicSidebar />
      <IllustSidebar />
      <ArticlesSidebar articles={articles} />
      <TagSidebar tags={tags} />
    </div>
  )
}
