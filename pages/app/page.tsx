import { Suspense } from 'react'
import BaseLayout from '@/components/large/base_layout'
import TopPage from './toppage'

export const dynamic = 'force-dynamic'

export default async function Mainpage() {
  return (
    <BaseLayout>
      <Suspense fallback={<div>loading...</div>}>
        <TopPage />
      </Suspense>
    </BaseLayout>
  )
}
