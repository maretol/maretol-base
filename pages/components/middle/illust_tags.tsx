import { atelierTagAndCategory } from 'api-types'

export default async function IllustTags({ tagOrCategory }: { tagOrCategory: atelierTagAndCategory[] }) {
  const tags = tagOrCategory.map((toc) => {
    return { id: toc.id, name: toc.tag, type: toc.type[0] }
  })
  return (
    <div className="mt-1">
      {tags.map((tag) => (
        <span key={tag.id} className="inline-block mr-2 mb-1 px-3 py-1 bg-gray-200 rounded-sm text-sm">
          {tag.type} : {tag.name}
        </span>
      ))}
    </div>
  )
}
