import Link from 'next/link'
import SidebarContentFrame from '../sidebar_content'

export default async function AboutSidebar({ rawText }: { rawText: string }) {
  const texts = rawText.split('\n')

  const fixedTexts = texts.map((text, i) => {
    if (text === '') {
      return <br key={i} />
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
    <SidebarContentFrame title="About">
      <div className="">{fixedTexts}</div>
    </SidebarContentFrame>
  )
}
