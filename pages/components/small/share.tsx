import { Button } from '../ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBluesky, faTwitter, faXTwitter } from '@fortawesome/free-brands-svg-icons'
import Link from 'next/link'
import ShareCopyAndPasteButton from './share_client'
import { addUtmParams, ContentType } from '@/lib/utm'

const titleFormat = '${title} | Maretol Base'

export default function ShareButton(props: {
  variant: 'twitter' | 'x' | 'facebook' | 'bluesky' | 'copy_and_paste'
  url: string
  title: string
  contentType?: ContentType
}) {
  const contentType = props.contentType ?? 'page'

  if (props.variant === 'twitter') {
    return <ShareTwitterButton {...props} contentType={contentType} />
  } else if (props.variant === 'x') {
    return <ShareXButton {...props} contentType={contentType} />
  } else if (props.variant === 'facebook') {
    return <ShareFacebookButton {...props} />
  } else if (props.variant === 'bluesky') {
    return <ShareBlurSkyButton {...props} contentType={contentType} />
  } else if (props.variant === 'copy_and_paste') {
    return <ShareCopyAndPasteButton {...props} contentType={contentType} />
  } else {
    return <div></div>
  }
}

function ShareTwitterButton({
  url,
  title,
  contentType,
}: {
  url: string
  title: string
  contentType: ContentType
}) {
  const twitterURL = 'https://twitter.com/intent/tweet'
  const urlWithUtm = addUtmParams(url, {
    source: 'twitter',
    medium: 'social',
    campaign: 'share_button',
    content: contentType,
  })
  const queries = new URLSearchParams({
    url: urlWithUtm,
    text: titleFormat.replace('${title}', title),
  })
  const href = `${twitterURL}?${queries.toString()}`
  return (
    <Button variant="secondary" className="p-3" asChild>
      <Link href={href} target="_blank" rel="noopener noreferrer">
        <FontAwesomeIcon icon={faTwitter} className={'h-6'} fontSize={24} />
      </Link>
    </Button>
  )
}

function ShareXButton({
  url,
  title,
  contentType,
}: {
  url: string
  title: string
  contentType: ContentType
}) {
  const xURL = 'https://x.com/intent/tweet'
  const urlWithUtm = addUtmParams(url, {
    source: 'twitter',
    medium: 'social',
    campaign: 'share_button',
    content: contentType,
  })
  const queries = new URLSearchParams({
    url: urlWithUtm,
    text: titleFormat.replace('${title}', title),
  })
  const href = `${xURL}?${queries.toString()}`
  return (
    <Button variant="secondary" className="p-3" asChild>
      <Link href={href} target="_blank" rel="noopener noreferrer">
        <FontAwesomeIcon icon={faXTwitter} className={'h-6'} fontSize={24} />
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

function ShareBlurSkyButton({
  url,
  title,
  contentType,
}: {
  url: string
  title: string
  contentType: ContentType
}) {
  const blurSkeyURL = 'https://bsky.app/intent/compose'
  const urlWithUtm = addUtmParams(url, {
    source: 'bluesky',
    medium: 'social',
    campaign: 'share_button',
    content: contentType,
  })
  const query = new URLSearchParams({
    text: titleFormat.replace('${title}', title) + '\n' + urlWithUtm,
  })
  const href = `${blurSkeyURL}?${query.toString()}`
  return (
    <Button variant="secondary" className="p-3" asChild>
      <Link href={href} target="_blank" rel="noopener noreferrer">
        <FontAwesomeIcon icon={faBluesky} className={'h-6'} fontSize={24} />
      </Link>
    </Button>
  )
}
