import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BookOpenIcon, Home, HomeIcon, ImageIcon, InfoIcon, MailIcon, NotebookTextIcon } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

type PagesPath = '/' | '/blog/' | '/illust/' | '/comics/' | '/about/' | '/contact/'

type LinkDetail = {
  icon: () => React.ReactNode
  text: string
  path: string
  description: string
}

export default async function MySiteCard({ text }: { text: string }) {
  const url = new URL(text)
  const path = (url.pathname.endsWith('/') ? url.pathname : url.pathname + '/') as PagesPath | null

  if (path === null) {
    return <p>未対応: {text}</p>
  }

  const iconClassName = 'w-4 h-4'
  const details: Record<PagesPath, LinkDetail> = {
    '/': {
      icon: () => {
        return <HomeIcon className={cn(iconClassName)} />
      },
      text: 'Top',
      path: '/',
      description: 'トップページ | Martol Base',
    },
    '/blog/': {
      icon: () => {
        return <NotebookTextIcon className={cn(iconClassName)} />
      },
      text: 'Blog',
      path: '/blog',
      description: 'ブログ | Martol Base',
    },
    '/illust/': {
      icon: () => {
        return <ImageIcon className={cn(iconClassName)} />
      },
      text: 'Illustrations',
      path: '/illust',
      description: 'イラスト | Martol Base',
    },
    '/comics/': {
      icon: () => {
        return <BookOpenIcon className={cn(iconClassName)} />
      },
      text: 'Comics',
      path: '/comics',
      description: 'マンガ | Martol Base',
    },
    '/about/': {
      icon: () => {
        return <InfoIcon className={cn(iconClassName)} />
      },
      text: 'About',
      path: '/about',
      description: 'このサイトについて | Martol Base',
    },
    '/contact/': {
      icon: () => {
        return <MailIcon className={cn(iconClassName)} />
      },
      text: 'Contact',
      path: '/contact',
      description: 'お問い合わせ・連絡 | Martol Base',
    },
  }

  const detail = details[path]

  return (
    <div className="max-w-2xl">
      <div className="flex flex-row items-center gap-2 p-4 bg-gray-300 rounded-lg">
        <div className="w-full">
          <div className="flex items-center gap-2 w-full">
            {detail.icon ? detail.icon() : <HomeIcon className={cn(iconClassName)} />}
            <div className="text-sm font-semibold text-gray-700">{detail.text}</div>
          </div>
          <p className="text-xs text-gray-500 ml-1">{detail.description}</p>
        </div>
        <Button asChild className="h-8">
          <Link href={detail.path} className="">
            Go to page
          </Link>
        </Button>
      </div>
    </div>
  )
}
