'use client'

import { ErrorPageComic } from '@/components/large/error'

export const runtime = 'edge'

export default function ComicErrorPage() {
  return (
    <div>
      <ErrorPageComic title="Not Found" />
    </div>
  )
}
