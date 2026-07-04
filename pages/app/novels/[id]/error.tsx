'use client'

import BaseLayout from '@/components/large/base_layout'
import { ErrorPageNovel } from '@/components/large/error'

export default function NovelErrorPage() {
  return (
    <BaseLayout>
      <ErrorPageNovel title="Not Found" />
    </BaseLayout>
  )
}
