import {
  ArrowLeftSquareIcon,
  ArrowRightSquareIcon,
  ArrowUpSquareIcon,
  BookImageIcon,
  CircleAlertIcon,
  HomeIcon,
} from 'lucide-react'
import Tags from '../middle/tags'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import Link from 'next/link'
import { Button } from '../ui/button'
import { convertJST, getCurrentTime } from '@/lib/time'
import FooterButtons from '../small/footer'
import ClientImage from '../small/client_image'
import { getHeaderImage } from '@/lib/image'
import { cn } from '@/lib/utils'

export function ErrorPageArticle({ title }: { title: string }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>現在時刻{convertJST(getCurrentTime())}</CardDescription>
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
          <Button variant="secondary" className="w-96 flex justify-center items-end gap-1" asChild>
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

export function ErrorPageComic({ title }: { title: string }) {
  const headerImage = getHeaderImage()

  return (
    <div>
      <div className="w-full h-screen bg-gray-700 flex justify-center items-center static">
        <div
          className={cn(
            'absolute top-0 left-0 w-full flex justify-center items-center bg-gray-300',
            'transition-opacity ease-in-out duration-100 opacity-0 hover:opacity-70'
          )}
        >
          <div className="pt-10 bg-gray-300 w-full max-w-[1500px]">
            <Button variant={'link'} className="p-0" asChild>
              <Link href="/">
                <ClientImage src={headerImage} width={500} height={200} alt="Maretol Base" />
              </Link>
            </Button>
          </div>
        </div>
        <CircleAlertIcon className="w-16 h-16 text-white" />
      </div>
      <div className="flex justify-center w-full">
        <div className="w-full max-w-[1500px]">
          <Card className="w-full">
            <CardContent className="py-2">
              <div className="mt-5 space-y-2">
                <h1 className="text-2xl font-bold pl-2 pb-1 content-h2">{title}</h1>
                <div className="flex items-center justify-end gap-2"></div>
                <div className="w-full font-semibold flex justify-center items-center gap-10">
                  <Button disabled variant="secondary" className="w-80 gap-1">
                    <div className="flex items-center justify-center gap-1">
                      <ArrowLeftSquareIcon className="w-4 h-4" />
                      Next episode
                    </div>
                  </Button>
                  <Button disabled variant="secondary" className="w-80 gap-1">
                    <div className="flex items-center justify-center gap-1">
                      Previous episode
                      <ArrowRightSquareIcon className="w-4 h-4" />
                    </div>
                  </Button>
                </div>
                <div className="w-full font-semibold flex justify-center items-center gap-10">
                  <Button disabled variant="secondary" className="w-80 gap-1">
                    <div className="flex items-center justify-center gap-1">
                      <ArrowUpSquareIcon className="w-4 h-4" />
                      This series
                    </div>
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardContent className="my-1 space-y-3">
              <h2 className="text-xl font-bold pb-1 border-blue-900 pl-3 border-l-4">作品詳細</h2>
              <div className="space-y-4 font-semibold">
                <div>
                  <p>タイトル : {title}</p>
                  <p>シリーズ : -</p>
                  <p>ジャンル : -</p>
                </div>
                <div>
                  <p>作成日 : -</p>
                  <p>最終更新日 : -</p>
                </div>
                <div>
                  <p>初公開イベント名 : -</p>
                  <p>初公開イベント日 : -</p>
                </div>
              </div>
              <div className="space-x-4 flex justify-center">
                <Button className="w-48 gap-1" asChild>
                  <Link href="/comics">
                    <BookImageIcon className="w-4 h-4" />
                    Comics Page Top
                  </Link>
                </Button>
                <Button className="w-48 gap-1" asChild>
                  <Link href="/">
                    <HomeIcon className="w-4 h-4" />
                    Page Home
                  </Link>
                </Button>
              </div>
            </CardContent>
            <hr className="border-gray-600 mx-4 h-8" />
            <CardContent>
              {' '}
              <div className="space-y-5 content">
                <p>対象のマンガが見つかりませんでした</p>
                <p>リンクが正確でなかったか、公開が停止された可能性があります</p>
                <p>Comics Page Top のリンクから探すか、Maretolに連絡してください</p>
              </div>
            </CardContent>
          </Card>
          <div className="my-10">
            <footer className="text-center text-sm text-gray-500">
              <FooterButtons />
              <div>
                © 2024 Maretol
                <br />
                DO NOT REPOST WITHOUT PERMISSION
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}
