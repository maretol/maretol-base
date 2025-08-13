import { Suspense } from 'react'
import BaseLayout from '@/components/large/base_layout'
import { LoadingTopPage } from '@/components/large/loading_toppage'
import TopPage from './toppage'

export const dynamic = 'force-dynamic'

export default async function Mainpage() {
  return (
    <BaseLayout>
      <Suspense fallback={<LoadingTopPage />}>
        <TopPage />
      </Suspense>
    </BaseLayout>
  )
}
