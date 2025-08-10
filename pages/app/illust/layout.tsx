import BaseLayout from '@/components/large/base_layout'

export default async function IllustLayout({
  children,
  drawer,
}: {
  children: React.ReactNode
  drawer: React.ReactNode
}) {
  return (
    <div>
      <BaseLayout>{children}</BaseLayout>
      {drawer}
    </div>
  )
}
