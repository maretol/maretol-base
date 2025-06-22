import { contentsAPIResult, staticAPIResult } from 'api-types'
import Profile from '../small/profile'
import { use } from 'react'

export default function BlogSidebar({
  staticData,
  articlesData,
}: {
  staticData: Promise<staticAPIResult>
  articlesData: Promise<{ contents: contentsAPIResult[] }>
}) {
  const staticDataResult = use(staticData)
  const profile = staticDataResult.sidebar_profile

  return (
    <div className="w-full h-full gap-y-4">
      <p>サイドバー</p>
      <Profile rawText={profile} />
      <p>タグ一覧</p>
      <p>最新記事5件</p>
      <p>イラストリンク</p>
      <p>マンガリンク</p>
    </div>
  )
}
