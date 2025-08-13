import { Suspense } from 'react'
import LoadingMainPage from './loading_article'
import BaseLayout from '@/components/large/base_layout'
import TopPage from './toppage'

export default async function Mainpage() {
  return (
    <BaseLayout>
      <Suspense fallback={<LoadingMainPage />}>
        <TopPage />
      </Suspense>
    </BaseLayout>
  )
}
