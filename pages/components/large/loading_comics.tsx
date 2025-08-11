import { LoaderCircleIcon } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Skeleton } from '../ui/skeleton'

export function LoadingComics() {
  return (
    <Card className="w-full p-4 bg-gray-100">
      <CardContent className="space-y-4">
        <div className="flex flex-row gap-4">
          <Skeleton className="h-[400px] w-80" />
          <div className="space-y-10">
            <div className="space-y-2">
              <Skeleton className="w-[400px] h-8" />
              <Skeleton className="w-80 h-3" />
              <Skeleton className="w-80 h-3" />
            </div>
            <div className="space-y-2">
              <Skeleton className="w-48 h-8" />
              <Skeleton className="w-80 h-3" />
              <Skeleton className="w-80 h-3" />
              <Skeleton className="w-80 h-3" />
            </div>
            <div className="space-y-2">
              <Skeleton className="w-48 h-8" />
              <Skeleton className="w-[500px] h-3" />
            </div>
          </div>
        </div>
        <Skeleton className="w-full h-12" />
      </CardContent>
    </Card>
  )
}

export function LoadingComicBook() {
  return (
    <div className="w-full h-screen flex justify-center items-center bg-gray-700">
      <LoaderCircleIcon className="w-24 h-24 text-white animate-spin" />
    </div>
  )
}
