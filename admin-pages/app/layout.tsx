import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/breadcrumbs'
import './globals.css'

export const metadata: Metadata = {
  title: 'Maretol Base CMS Admin',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-4 py-3">
            <Link href="/" className="text-lg font-bold">
              Maretol Base CMS Admin
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/illust" className="text-gray-600 hover:text-gray-900">
                イラスト
              </Link>
              <Link href="/comic" className="text-gray-600 hover:text-gray-900">
                マンガ
              </Link>
              <Link href="/novel" className="text-gray-600 hover:text-gray-900">
                小説
              </Link>
              <Link href="/blog" className="text-gray-600 hover:text-gray-900">
                ブログ
              </Link>
              <Link href="/cache" className="text-gray-600 hover:text-gray-900">
                キャッシュ
              </Link>
              <Link href="/sns" className="text-gray-600 hover:text-gray-900">
                SNS投稿
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] px-4 py-6">
          <Breadcrumbs />
          {children}
        </main>
      </body>
    </html>
  )
}
