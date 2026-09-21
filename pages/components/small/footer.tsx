import Link from 'next/link'
import AppLink from './app_link'
import { Button } from '../ui/button'
import { ArrowBigUpIcon, HomeIcon } from 'lucide-react'

export default function FooterButtons() {
  const buttonClassName = 'w-48 gap-1 font-suse'
  const iconClassName = 'w-4 h-4'
  return (
    <div className="flex sm:flex-row flex-col justify-center items-center mb-4">
      <Button variant="default" className={buttonClassName} asChild>
        <AppLink href="/">
          <HomeIcon className={iconClassName} />
          Back to the Home
        </AppLink>
      </Button>
      <Button variant="secondary" className={buttonClassName} asChild>
        <Link href="#top" scroll={true} replace={true}>
          <ArrowBigUpIcon className={iconClassName} />
          Jump to the Top
        </Link>
      </Button>
    </div>
  )
}
