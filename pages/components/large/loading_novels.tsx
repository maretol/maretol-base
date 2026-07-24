import { Card, CardContent } from '../ui/card'
import { Skeleton } from '../ui/skeleton'

export function LoadingNovels() {
  return (
    <Card className="w-full p-4 bg-gray-100">
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="w-[400px] max-w-full h-8" />
          <Skeleton className="w-80 max-w-full h-3" />
          <Skeleton className="w-80 max-w-full h-3" />
        </div>
        <div className="space-y-2">
          <Skeleton className="w-48 h-8" />
          <Skeleton className="w-80 max-w-full h-3" />
          <Skeleton className="w-80 max-w-full h-3" />
          <Skeleton className="w-80 max-w-full h-3" />
        </div>
        <div className="space-y-2">
          <Skeleton className="w-48 h-8" />
          <Skeleton className="w-[500px] max-w-full h-3" />
          <Skeleton className="w-[500px] max-w-full h-3" />
        </div>
        <Skeleton className="w-full h-12" />
      </CardContent>
    </Card>
  )
}
