'use client'

import { ErrorPageArticle } from '@/lib/components/large/error'

export const runtime = 'edge'

export default function BlogErrorPage() {
  return (
    <div>
      <ErrorPageArticle title="404 Not Found" />
    </div>
  )
}
