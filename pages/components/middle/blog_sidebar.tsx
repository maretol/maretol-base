import { atelierResult, bandeDessineeResult, categoryAPIResult, contentsAPIResult, staticAPIResult } from 'api-types'
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
  bandeDessineeData,
  atelierData,
  tagData,
}: {
  staticData: Promise<staticAPIResult>
  articlesData: Promise<{ contents: contentsAPIResult[] }>
  bandeDessineeData: Promise<{ bandeDessinees: bandeDessineeResult[] }>
  atelierData: Promise<{ ateliers: atelierResult[] }>
  tagData: Promise<categoryAPIResult[]>
}) {
  const staticDataResult = use(staticData)
  const profile = staticDataResult.sidebar_profile
  const about = staticDataResult.sidebar_about

  const articleDataResult = use(articlesData)
  const articles = articleDataResult.contents

  const bandeDessineeDataResult = use(bandeDessineeData)
  const bandeDessinees = bandeDessineeDataResult.bandeDessinees

  const atelierDataResult = use(atelierData)
  const atelier = atelierDataResult.ateliers

  const tags = use(tagData)

  return (
    <div className="w-full h-full gap-4 flex flex-col">
      <AboutSidebar rawText={about} />
      <Profile rawText={profile} />
      <ComicSidebar bandeDessinees={bandeDessinees} />
      <IllustSidebar atelier={atelier} />
      <ArticlesSidebar articles={articles} />
      <TagSidebar tags={tags} />
    </div>
  )
}
