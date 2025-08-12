import ShareButton from '../small/share'

export default function ShareSection({ shareURL, shareTitle }: { shareURL: string; shareTitle: string }) {
  return (
    <>
      <ShareButton variant="twitter" url={shareURL} title={shareTitle} />
      <ShareButton variant="bluesky" url={shareURL} title={shareTitle} />
      <ShareButton variant="copy_and_paste" url={shareURL} title={shareTitle} />
    </>
  )
}
