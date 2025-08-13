import { cn } from '@/lib/utils'

export default async function TopPageContentsChild({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'md:snap-start snap-center snap-always',
        'max-md:first:ml-24',
        'h-fit lg:w-2/3 w-4/5 mb-4 flex-none'
      )}
    >
      {children}
    </div>
  )
}
