import { HomeIcon } from 'lucide-react'
import Tags from '../middle/tags'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card'
import Link from 'next/link'
import { Button } from '../ui/button'
import { convertJST, getCurrentTime } from '@/lib/time'

export function ErrorPageArticle({ title }: { title: string }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          現在時刻{convertJST(getCurrentTime())}
        </CardDescription>
        <CardContent className="pl-0 pt-2 pb-0">
          <Tags tags={[]} />
        </CardContent>
      </CardHeader>
      <CardContent>
        <div className="space-y-5 content">
          <p>
            エラーが発生しました。このページに到達する際にクリックしたリンクが正確だったかどうかを確認してください。
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex justify-center mt-2 w-full">
          <Button
            variant="secondary"
            className="w-96 flex justify-center items-end gap-1"
            asChild
          >
            <Link href="/">
              <HomeIcon />
              <h2>Home</h2>
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
