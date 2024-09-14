import { FacebookIcon, TwitterIcon, X } from 'lucide-react'
import { Button } from '../ui/button'
import Link from 'next/link'
import ShareCopyAndPasteButton from './share_client'

const titleFormat = '${title} | Maretol Base'

export default function ShareButton(props: { variant: 'twitter' | 'x' | 'facebook' | 'copy_and_paste'; url: string; title: string }) {
  if (props.variant === 'twitter') {
    return <ShareTwitterButton {...props} />
  } else if (props.variant === 'x') {
    return <ShareXButton {...props} />
  } else if (props.variant === 'facebook') {
    return <ShareFacebookButton {...props} />
  } else if (props.variant === 'copy_and_paste') {
    return <ShareCopyAndPasteButton {...props} />
  } else {
    return <div></div>
  }
}

function ShareTwitterButton({ url, title }: { url: string; title: string }) {
  const twitterURL = 'https://twitter.com/intent/tweet'
  const queries = new URLSearchParams({
    url: url,
    text: titleFormat.replace('${title}', title),
  })
  const href = `${twitterURL}?${queries.toString()}`
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer">
      <Button variant="secondary" className="p-3">
        <TwitterIcon size={20} />
      </Button>
    </Link>
  )
}

function ShareXButton({ url }: { url: string }) {
  return (
    <Link href={url} target="_blank" rel="noopener noreferrer">
      <Button variant="secondary" className="p-3">
        <X size={24} />
      </Button>
    </Link>
  )
}

function ShareFacebookButton({ url }: { url: string }) {
  return (
    <Link href={url} target="_blank" rel="noopener noreferrer" hidden>
      <Button variant="secondary" className="p-3">
        <FacebookIcon size={24} />
      </Button>
    </Link>
  )
}
