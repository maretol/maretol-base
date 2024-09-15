import Link from 'next/link'
import { Button } from '../ui/button'
import { ArrowBigUpIcon, HomeIcon } from 'lucide-react'

export default function FooterButtons() {
  const buttonClassName = 'w-48 gap-1'
  const iconClassName = 'w-4 h-4'
  return (
    <div className="flex sm:flex-row flex-col justify-center items-center mb-4">
      <Button variant="default" className={buttonClassName} asChild>
        <Link href="/">
          <HomeIcon className={iconClassName} />
          Back to the Home
        </Link>
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
