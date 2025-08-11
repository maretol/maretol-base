import BlogLayout from '@/components/large/blog_layout'
import { getHostname } from '@/lib/env'
import { getOGPImage } from '@/lib/image'
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
    images: [getOGPImage()],
  },
  openGraph: {
    title: 'Blog | Maretol Base',
    description: 'Maretolのホームページ | ブログ',
    type: 'website',
    url: getHostname() + '/blog',
    siteName: 'Blog | Maretol Base',
    images: [getOGPImage()],
  },
}

export default function BlogPageLayout({ children }: { children: React.ReactNode }) {
  return <BlogLayout>{children}</BlogLayout>
}
