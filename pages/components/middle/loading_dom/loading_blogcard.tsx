import { Button } from '@/components/ui/button'

export default function LoadingBlogCard() {
  return (
    <div className="flex max-w-2xl bg-gray-300">
      <Button variant={'outline'} className="no-underline bg-gray-300 h-full w-full" disabled>
        <div className="w-full flex flex-col self-end text-left">
          <p className="text-md text-wrap line-clamp-2">loading...</p>
          <p className="text-xs text-gray-500 text-wrap line-clamp-2">yyyy/mm/dd hh:mm:ss JST</p>
        </div>
      </Button>
    </div>
  )
}
