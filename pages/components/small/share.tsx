import { Button } from '../ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBluesky, faTwitter, faXTwitter } from '@fortawesome/free-brands-svg-icons'
import Link from 'next/link'
import ShareCopyAndPasteButton from './share_client'

const titleFormat = '${title} | Maretol Base'

export default function ShareButton(props: {
  variant: 'twitter' | 'x' | 'facebook' | 'bluesky' | 'copy_and_paste'
  url: string
  title: string
}) {
  if (props.variant === 'twitter') {
    return <ShareTwitterButton {...props} />
  } else if (props.variant === 'x') {
    return <ShareXButton {...props} />
  } else if (props.variant === 'facebook') {
    return <ShareFacebookButton {...props} />
  } else if (props.variant === 'bluesky') {
    return <ShareBlurSkyButton {...props} />
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
    <Button variant="secondary" className="p-3" asChild>
      <Link href={href} target="_blank" rel="noopener noreferrer">
        <FontAwesomeIcon icon={faTwitter} className={'h-6'} />
      </Link>
    </Button>
  )
}

function ShareXButton({ url }: { url: string }) {
  return (
    <Button variant="secondary" className="p-3" asChild>
      <Link href={url} target="_blank" rel="noopener noreferrer">
        <FontAwesomeIcon icon={faXTwitter} className={'h-6'} />
      </Link>
    </Button>
  )
}

function ShareFacebookButton({ url }: { url: string }) {
  return (
    <Link href={url} target="_blank" rel="noopener noreferrer" hidden>
      <Button variant="secondary" className="p-3">
        {/* <FacebookIcon size={24} /> ** 非推奨になってたので一旦消す（どっちみち使ってないし） ** */}
      </Button>
    </Link>
  )
}

function ShareBlurSkyButton({ url, title }: { url: string; title: string }) {
  const blurSkeyURL = 'https://bsky.app/intent/compose'
  const query = new URLSearchParams({
    text: titleFormat.replace('${title}', title) + '\n' + url,
  })
  const href = `${blurSkeyURL}?${query.toString()}`
  return (
    <Button variant="secondary" className="p-3" asChild>
      <Link href={href} target="_blank" rel="noopener noreferrer">
        <FontAwesomeIcon icon={faBluesky} className={'h-6'} />
      </Link>
    </Button>
  )
}
