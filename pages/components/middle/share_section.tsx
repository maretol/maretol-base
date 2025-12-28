import ShareButton from '../small/share'
import { ContentType } from '@/lib/utm'

export default function ShareSection({
  shareURL,
  shareTitle,
  contentType,
}: {
  shareURL: string
  shareTitle: string
  contentType?: ContentType
}) {
  return (
    <>
      <ShareButton variant="twitter" url={shareURL} title={shareTitle} contentType={contentType} />
      <ShareButton variant="bluesky" url={shareURL} title={shareTitle} contentType={contentType} />
      <ShareButton variant="copy_and_paste" url={shareURL} title={shareTitle} contentType={contentType} />
    </>
  )
}
