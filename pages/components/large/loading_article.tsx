import { Card, CardContent, CardHeader } from '../ui/card'
import { Skeleton } from '../ui/skeleton'

export function LoadingArticle() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="w-1/4 h-9" />
        <Skeleton className="w-1/12 h-4" />
        <CardContent className="pl-0 pt-2 pb-0">
          <Skeleton className="w-10 h-6" />
        </CardContent>
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full h-96" />
      </CardContent>
    </Card>
  )
}

export function LoadingFullArticle() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="w-1/4 h-9" />
        <Skeleton className="w-1/12 h-4" />
        <CardContent className="pl-0 pt-2 pb-0">
          <Skeleton className="w-10 h-6" />
        </CardContent>
      </CardHeader>
      <CardContent className="space-y-8">
        <Skeleton className="w-full h-8" />
        <Skeleton className="w-1/6 h-8" />
        <Skeleton className="w-1/3 h-8" />
        <Skeleton className="w-1/2 h-8" />
        <Skeleton className="w-1/8 h-8" />
        <Skeleton className="w-[500px] h-[144px]" />
        <Skeleton className="w-1/8 h-8" />
        <Skeleton className="w-1/12 h-8" />
        <Skeleton className="w-1/2 h-8" />
        <Skeleton className="w-1/3 h-8" />
        <Skeleton className="w-1/2 h-8" />
        <Skeleton className="w-1/3 h-8" />
        <Skeleton className="w-1/12 h-8" />
        <Skeleton className="w-1/2 h-8" />
        <Skeleton className="w-1/2 h-8" />
        <Skeleton className="w-1/8 h-8" />
        <Skeleton className="w-1/2 h-8" />
        <Skeleton className="w-1/6 h-8" />
      </CardContent>
    </Card>
  )
}
