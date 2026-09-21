import Link from 'next/link'
import AppLink from './app_link'
import { Button } from '../ui/button'
import { BookOpenIcon, ImageIcon, Info, MailIcon, NotebookText, RssIcon } from 'lucide-react'

export default function HeaderButtons() {
  const iconClassName = 'w-4 h-4'
  const buttonClassName = 'w-full gap-1 font-suse font-semibold'
  const subButtonClassName = 'w-12'
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1">
      <Button variant={'outline'} className={buttonClassName} asChild>
        <AppLink href="/illust">
          <ImageIcon className={iconClassName} />
          Illustrations
        </AppLink>
      </Button>
      <Button variant="outline" className={buttonClassName} asChild>
        <AppLink href="/comics">
          <BookOpenIcon className={iconClassName} />
          Comics
        </AppLink>
      </Button>
      <Button variant="outline" className={buttonClassName} asChild>
        <AppLink href="/blog">
          <NotebookText className={iconClassName} />
          Blog
        </AppLink>
      </Button>
      <div className="flex flex-between gap-1 sm:col-span-2">
        <Button variant="outline" className={subButtonClassName} asChild>
          <AppLink href="/about">
            <Info className={iconClassName} />
          </AppLink>
        </Button>
        <Button variant="outline" className={subButtonClassName} asChild>
          <AppLink href="/contact">
            <MailIcon className={iconClassName} />
          </AppLink>
        </Button>
        <Button variant="outline" className={subButtonClassName} asChild>
          <Link href="/rss/feed.rdf">
            <RssIcon className={iconClassName} />
          </Link>
        </Button>
      </div>
    </div>
  )
}
