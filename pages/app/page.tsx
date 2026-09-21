import BaseLayout from '@/components/large/base_layout'
import TopPage from './toppage'

export const dynamic = 'force-dynamic'

export default async function Mainpage() {
  return (
    <BaseLayout>
      {/* 一瞬で終わる遷移でスケルトンがちらつくため Suspense は挟まない。遷移中の表示は AppLink のインジケーターが担う（issue #1284） */}
      <TopPage />
    </BaseLayout>
  )
}
