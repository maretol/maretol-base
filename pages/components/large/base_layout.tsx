// このコンポーネントの目的
//   幅が広い画面で左右に空白を作る
//   画面中央にコンテンツを表示する
//   ヘッダーと画像、フッターを表示する

import Link from 'next/link'
import { Button } from '../ui/button'
import ClientImage from '../small/client_image'
import HeaderButtons from '../small/header'
import FooterButtons from '../small/footer'
import { getHeaderImage } from '@/lib/image'

export default function BaseLayout({ children }: { children: React.ReactNode }) {
  const headerImage = getHeaderImage()

  const year = new Date().getFullYear()

  return (
    <div className="flex justify-center pb-10" id="top">
      <div className="max-w-[1500px] w-full sm:mx-6">
        <div className="my-10">
          <div className="mb-2 pt-2">
            <Button variant={'link'} className="p-0" asChild>
              <Link href="/">
                <ClientImage src={headerImage} width={500} height={200} alt="Maretol Base" />
              </Link>
            </Button>
          </div>
          <HeaderButtons />
        </div>
        {children}
        <div className="my-10">
          <footer className="text-center text-sm text-gray-500">
            <FooterButtons />
            <div>
              © 2024 - {year} Maretol
              <br />
              DO NOT REPOST WITHOUT PERMISSION
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
