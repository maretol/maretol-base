// このコンポーネントの目的
//   幅が広い画面で左右に空白を作る
//   画面中央にコンテンツを表示する
//   ヘッダーと画像、フッターを表示する

import Link from 'next/link'
import { Button } from '../ui/button'
import HeaderButtons from '../small/header'
import FooterButtons from '../small/footer'
import { getHeaderImageURL } from '@/lib/image'
import { getAteliers, getBandeDessinee, getCMSContents, getStatic, getTags } from '@/lib/api/workers'
import BlogSidebar from '../middle/blog_sidebar'
import ClientImage2 from '../small/client_image2'

export default async function BlogLayout({ children }: { children: React.ReactNode }) {
  // experimental が抜けたら use cache あたりを使ってコンポーネントをキャッシュさせたほうがいいかもしれない
  // 現状では /blog/* の layout で呼ばれる部分とそれ以外の layout で呼ばれる部分で別々にコンポーネントが生成されてる
  const headerImage = getHeaderImageURL()

  const year = new Date().getFullYear()

  const staticData = getStatic()
  const articlesData = getCMSContents(0, 5)
  const bandeDessineeData = getBandeDessinee(0, 5)
  const atelierData = getAteliers(0, 5)
  const tagData = getTags()

  return (
    <div className="flex justify-center pb-10" id="top">
      <div className="max-w-[1500px] w-full sm:mx-6">
        <div className="my-10">
          <div className="mb-2 pt-2">
            <Button variant={'link'} className="p-0" asChild>
              <Link href="/">
                <ClientImage2
                  src={headerImage}
                  width={400}
                  height={100}
                  className="w-[500px] object-contain"
                  alt="Maretol Base"
                />
              </Link>
            </Button>
          </div>
          <HeaderButtons />
        </div>
        <div className="md:flex md:flex-row">
          <div className="basis-4/5">{children}</div>
          <div className="basis-1/5 ml-4 not-md:hidden">
            <BlogSidebar
              staticData={staticData}
              articlesData={articlesData}
              bandeDessineeData={bandeDessineeData}
              atelierData={atelierData}
              tagData={tagData}
            />
          </div>
        </div>
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
