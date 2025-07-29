import { Skeleton } from '@/components/ui/skeleton'

export default function LoadingLinkcard({ link }: { link: string }) {
  return (
    <div className="max-w-2xl no-underline border-2 border-gray-300 rounded-md">
      <a href={link} target="_blank" className="hover:no-underline">
        <div className="flex flex-row h-24">
          <div className="row-span-3 w-36 h-24">
            <Skeleton className="object-contain w-36 h-24" />
          </div>
          <div className="col-span-2 w-96 flex-auto mr-2">
            <Skeleton className="mx-3 w-96 h-6 my-2" />
            <Skeleton className="mx-3 w-96 h-4 my-2" />
            <Skeleton className="mx-3 w-96 h-4 my-2" />
          </div>
        </div>
        <div className="p-1 bg-gray-300 rounded-b-md">
          <p className="no-underline text-sm line-clamp-1 animate-pulse">Loading...</p>
          <p className="no-underline text-sm line-clamp-1 animate-pulse">{link}</p>
        </div>
      </a>
    </div>
  )
}
