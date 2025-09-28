import Link from 'next/link'
import { Button } from '../ui/button'
import { BookOpenIcon, ImageIcon, Info, MailIcon, NotebookText, RssIcon } from 'lucide-react'

export default function HeaderButtons() {
  const iconClassName = 'w-4 h-4'
  const buttonClassName = 'w-full gap-1 font-suse font-semibold'
  const subButtonClassName = 'w-12'
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1">
      <Button variant={'outline'} className={buttonClassName} asChild>
        <Link href="/illust">
          <ImageIcon className={iconClassName} />
          Illustrations
        </Link>
      </Button>
      <Button variant="outline" className={buttonClassName} asChild>
        <Link href="/comics">
          <BookOpenIcon className={iconClassName} />
          Comics
        </Link>
      </Button>
      <Button variant="outline" className={buttonClassName} asChild>
        <Link href="/blog">
          <NotebookText className={iconClassName} />
          Blog
        </Link>
      </Button>
      <div className="flex flex-between gap-1 sm:col-span-2">
        <Button variant="outline" className={subButtonClassName} asChild>
          <Link href="/about">
            <Info className={iconClassName} />
          </Link>
        </Button>
        <Button variant="outline" className={subButtonClassName} asChild>
          <Link href="/contact">
            <MailIcon className={iconClassName} />
          </Link>
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
