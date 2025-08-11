import { cn } from '@/lib/utils'
import { Skeleton } from '../ui/skeleton'

export function LoadingIllustSample() {
  return (
    <div className={cn('w-full lg:h-[45svh] max-h-3/4 rounded-2xl bg-gray-100', 'flex lg:flex-row', 'flex-col')}>
      <Skeleton className={cn('lg:w-3/4 w-full lg:h-full h-[45svh] rounded-2xl')} />
      <div className="p-4 h-full lg:w-1/4 flex flex-col lg:justify-between w-full gap-4">
        <div className="flex flex-col gap-2 mt-4">
          <div className="border-b-4 border-blue-900 pb-1">
            <Skeleton className="w-3/4 h-6" />
          </div>
          <Skeleton className="w-1/2 h-4" />
          <Skeleton className="w-1/3 h-4" />
        </div>
        <Skeleton className="w-full h-10" />
      </div>
    </div>
  )
}
