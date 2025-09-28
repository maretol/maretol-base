import { cn } from '@/lib/utils'

export default function TopPageTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full bg-gradient-to-l from-bg-gray-50 to-gray-50/100 pl-2 rounded-lg py-1">
      <h1 className={cn('text-2xl font-semibold flex flex-row items-center gap-2 font-suse')}>{children}</h1>
    </div>
  )
}
