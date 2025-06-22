import BlogLayout from '@/components/large/blog_layout'

export default function BlogPageLayout({ children }: { children: React.ReactNode }) {
  return <BlogLayout>{children}</BlogLayout>
}
