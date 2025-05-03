import { TableOfContents } from 'api-types'
import Link from 'next/link'

export default function Table({ toc }: { toc: TableOfContents }) {
  let beforeLevel = 0
  return (
    <div className="bg-gray-100 p-4 mt-4 rounded-lg">
      <h2 className="text-lg font-bold">Contents</h2>
      <hr className="border-gray-500" />
      <div className="ml-4 mt-2">
        {toc.map((t, i) => {
          if (t.level <= 1) {
            const levelDown = beforeLevel > t.level
            beforeLevel = t.level
            return (
              <div key={i} className={`ml-2 w-fit` + (levelDown ? ' mt-1' : '')}>
                <Link className="hover:underline" href={`#${t.id}`}>
                  <p className="font-semibold text-black">{t.title}</p>
                </Link>
              </div>
            )
          } else if (t.level === 2) {
            const levelDown = beforeLevel > t.level
            beforeLevel = t.level
            return (
              <div key={i} className={`ml-6 w-fit` + (levelDown ? ' mt-1' : '')}>
                <Link className="hover:underline" href={`#${t.id}`}>
                  <p className="font-semibold text-black">{t.title}</p>
                </Link>
              </div>
            )
          } else if (t.level === 3) {
            const levelDown = beforeLevel > t.level
            beforeLevel = t.level
            return (
              <div key={i} className={`ml-10 w-fit` + (levelDown ? ' mt-1' : '')}>
                <Link className="hover:underline" href={`#${t.id}`}>
                  <p className="font-semibold text-black">{t.title}</p>
                </Link>
              </div>
            )
          } else {
            const levelDown = beforeLevel > t.level
            beforeLevel = t.level
            return (
              <div key={i} className={`ml-14 w-fit` + (levelDown ? ' mt-1' : '')}>
                <Link className="hover:underline" href={`#${t.id}`}>
                  <p className="font-semibold text-black">{t.title}</p>
                </Link>
              </div>
            )
          }
        })}
      </div>
    </div>
  )
}
