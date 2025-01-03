import { Skeleton } from '@/components/ui/skeleton'

export default function LoadingComicCard() {
  return (
    <div className="max-w-xl border-2 bg-gray-300 rounded-md">
      <div className="w-full flex flex-row space-x-4 m-2 ml-4">
        <Skeleton className="w-36 h-52" />
        <div className="space-y-6">
          <div>
            <Skeleton className="mx-3 w-80 h-6 my-2" />
            <Skeleton className="mx-3 w-48 h-4 my-2" />
            <Skeleton className="mx-3 w-48 h-4 my-2" />
          </div>
          <div>
            <Skeleton className="mx-3 w-48 h-4 my-2" />
            <Skeleton className="mx-3 w-48 h-4 my-2" />
          </div>
          <div>
            <Skeleton className="mx-3 w-80 h-4 my-2" />
          </div>
        </div>
      </div>
    </div>
  )
}
