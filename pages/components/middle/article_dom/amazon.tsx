import { Button } from '@/components/ui/button'
import { ShoppingCartIcon } from 'lucide-react'
import Link from 'next/link'

export default function AmazonArea({ amazonURL }: { amazonURL: string }) {
  if (!amazonURL) {
    return <p>Amazonの埋め込みがありましたがURLが不正ですなようです</p>
  }

  return (
    <div className="py-2">
      <Button asChild className="bg-gray-900 text-gray-100 space-x-2">
        <Link href={amazonURL} target="_blank">
          <ShoppingCartIcon size={24} />
          <p>Amazon商品リンク</p>
        </Link>
      </Button>
    </div>
  )
}
