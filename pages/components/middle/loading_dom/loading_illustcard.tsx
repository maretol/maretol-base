import { Skeleton } from '@/components/ui/skeleton'

export default function LoadingIllustCard() {
  return (
    <div className="max-w-2xl">
      <div className="bg-gray-300 h-full w-full px-4 py-2 rounded-md">
        <div className="flex flex-row space-x-4">
          <Skeleton className="w-2/3 h-56 rounded-sm" />
          <div className="w-1/3 flex flex-col justify-between items-start">
            <div className="w-full">
              <Skeleton className="w-full h-6 mb-2" />
              <Skeleton className="w-full h-4 mb-2" />
            </div>
            <div className="w-full">
              <Skeleton className="w-full h-8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
