import { Annotation } from 'api-types'
import Link from 'next/link'

export default function Annotations({ annotations }: { annotations: Annotation[] }) {
  if (annotations.length === 0) {
    return null
  }

  return (
    <div className="mt-8 pt-4 border-t border-gray-300">
      <ol className="list-none pl-0">
        {annotations.map((annotation) => (
          <li key={annotation.number} id={`annotation-${annotation.number}`} className="text-sm text-gray-600 mb-1">
            <span className="font-semibold mr-1">[{annotation.number}]</span>
            {annotation.text}
            <Link
              href={`#annotation-ref-${annotation.number}`}
              className="ml-1 text-gray-400 hover:text-gray-600 no-underline"
            >
              ↩
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
