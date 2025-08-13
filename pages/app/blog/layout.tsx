import BlogLayout from '@/components/large/blog_layout'
import { getHostname } from '@/lib/env'
import { getDefaultOGPImageURL, getOGPImageURL } from '@/lib/image'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog | Maretol Base',
  description: 'Maretolのホームページ | ブログ',
  twitter: {
    title: 'Blog | Maretol Base',
    description: 'Maretolのホームページ | ブログ',
    card: 'summary',
    creator: '@maretol',
    site: '@maretol',
    images: [getOGPImageURL(getDefaultOGPImageURL())],
  },
  openGraph: {
    title: 'Blog | Maretol Base',
    description: 'Maretolのホームページ | ブログ',
    type: 'website',
    url: getHostname() + '/blog',
    siteName: 'Blog | Maretol Base',
    images: [getOGPImageURL(getDefaultOGPImageURL())],
  },
}

export default function BlogPageLayout({ children, drawer }: { children: React.ReactNode; drawer: React.ReactNode }) {
  return (
    <div>
      <BlogLayout>{children}</BlogLayout>
      {drawer}
    </div>
  )
}
