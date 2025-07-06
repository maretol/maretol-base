import Link from 'next/link'
import SidebarContentFrame from '../sidebar_content'

export default async function Profile({ rawText }: { rawText: string }) {
  const texts = rawText.split('\n')

  const fixedTexts = texts.map((text, i) => {
    if (text === '') {
      return <br key={i} />
    } else if (text.startsWith('Twitter:')) {
      const removeHeader = text.replace('Twitter:', '').trim()
      const twitterID = removeHeader.replace('@', '')
      return (
        <p key={i}>
          Twitter:{' '}
          <Link href={`https://twitter.com/${twitterID}`} target="_blank" className="hover:underline">
            {removeHeader}
          </Link>
        </p>
      )
    } else if (text.startsWith('Misskey:')) {
      const removeHeader = text.replace('Misskey:', '').trim()
      return (
        <p key={i}>
          Misskey:{' '}
          <Link href={`https://misskey.io/${removeHeader}`} target="_blank" className="hover:underline">
            {removeHeader}
          </Link>
        </p>
      )
    } else if (text.startsWith('Bluesky:')) {
      const removeHeader = text.replace('Bluesky:', '').trim()
      const blueskyID = removeHeader.replace('@', '')
      return (
        <p key={i}>
          Bluesky:{' '}
          <Link href={`https://bsky.app/profile/${blueskyID}`} target="_blank" className="hover:underline">
            {removeHeader}
          </Link>
        </p>
      )
    } else {
      const line = text.split(' ')
      return (
        <p key={i}>
          {line.map((word, j) => {
            if (word === '/contact') {
              return (
                <Link key={j} href="/contact" className="hover:underline">
                  {word}
                </Link>
              )
            } else if (word.startsWith('/about')) {
              return (
                <Link key={j} href="/about" className="hover:underline">
                  {word}
                </Link>
              )
            } else {
              return <span key={j}> {word} </span>
            }
          })}
        </p>
      )
    }
  })

  return (
    <SidebarContentFrame title="Profile">
      <div className="">{fixedTexts}</div>
    </SidebarContentFrame>
  )
}
