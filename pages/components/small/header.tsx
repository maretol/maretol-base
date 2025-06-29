import Link from 'next/link'
import { Button } from '../ui/button'
import { Info, MessageCircle, NotebookText, RssIcon } from 'lucide-react'

export default function HeaderButtons() {
  const iconClassName = 'w-4 h-4'
  const buttonClassName = 'w-full gap-1'
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1">
      <Button variant="outline" className={buttonClassName} asChild>
        <Link href="/blog">
          <NotebookText className={iconClassName} />
          Blog
        </Link>
      </Button>
      <Button variant="outline" className={buttonClassName} asChild>
        <Link href="/about">
          <Info className={iconClassName} />
          About
        </Link>
      </Button>
      <Button variant="outline" className={buttonClassName} asChild>
        <Link href="/contact">
          <MessageCircle className={iconClassName} />
          Contact
        </Link>
      </Button>
      <Button variant="outline" className={'w-12'} asChild>
        <Link href="/rss/feed.rdf">
          <RssIcon className={iconClassName} />
        </Link>
      </Button>
    </div>
  )
}
