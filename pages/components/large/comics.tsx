import { BandeDessineeConfig, ParsedContent, TableOfContents } from 'api-types'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitleH1 } from '../ui/card'
import { convertJST, convertJSTDate } from '@/lib/time'
import ClientImage from '../small/client_image'
import { rewriteImageURL } from '@/lib/image'
import { imageOption, originImageOption } from '@/lib/static'
import ArticleContent from '../middle/article_content'
import { Button } from '../ui/button'
import Link from 'next/link'
import { BookImageIcon } from 'lucide-react'
import ComicBook from '../middle/comicbook'

type ComicArticleProps = {
  id: string
  publishedAt: string
  updatedAt: string
  titleName: string
  publishDate: string | null
  publishEvent: string | null
  contentsUrl: string
  nextId: string | null
  previousId: string | null
  parsedDescription: ParsedContent[]
  tableOfContents: TableOfContents
}

type ComicBookProps = {
  id: string
  baseUrl: string
  coverImage: string
  backCoverImage: string
  firstPageNumber: number
  lastPageNumber: number
  firstPageLeftRight: 'left' | 'right'
  format: string
  filename: string
  parsedDescription: ParsedContent[]
  next: string | null
  previous: string | null
}

export async function ComicOverview(props: ComicArticleProps) {
  const contentsUrl = props.contentsUrl

  const contentsJSON = await fetch(contentsUrl)
  const contentsConfig = (await contentsJSON.json()) as BandeDessineeConfig

  const contentsBaseURL = contentsUrl.replaceAll('/index.json', '')

  // 表紙
  const coverImageOriginURL = contentsBaseURL + '/' + contentsConfig.cover
  const coverImageURL = rewriteImageURL(imageOption, coverImageOriginURL)
  // 説明文
  const description = props.parsedDescription
  // マンガのタイトル
  const title = props.titleName
  // マンガページのリンクURL
  const linkURL = `/comics/${props.id}`

  return (
    <Card className="w-full">
      <CardHeader className="py-2"></CardHeader>
      <div className="flex sm:flex-row flex-col">
        <CardContent className="sm:max-w-full flex flex-row justify-center pb-0">
          <ClientImage src={coverImageURL} alt={title} width={400} height={800} className="m-2" />
        </CardContent>
        <div className="w-full">
          <CardHeader className="pt-2">
            <CardTitleH1>
              <Link href={linkURL} className="hover:underline">
                {title}
              </Link>
            </CardTitleH1>
            <CardDescription>
              <>
                作成日{convertJST(props.publishedAt)}
                <br />
                最終更新{convertJST(props.updatedAt)}
              </>
            </CardDescription>
          </CardHeader>
          <CardContent className="my-1 space-y-6">
            <div className="w-full space-y-3 font-semibold">
              <h2 className="text-xl font-bold pl-2 pb-1 content-h2">作品情報</h2>
              <div>
                {props.publishDate && <p>初公開日 : {convertJSTDate(props.publishDate)}</p>}
                {props.publishEvent && <p>イベント : {props.publishEvent}</p>}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold pl-2 pb-1 content-h2">概要</h2>
              <ArticleContent contents={[description[0]]} sample articleID={props.id} />
            </div>
          </CardContent>
        </div>
      </div>
      <CardFooter>
        <Button variant="default" className="w-full gap-1" asChild>
          <Link href={linkURL}>
            <BookImageIcon className="w-4 h-4" />
            Read This
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export async function ComicBookPage(props: ComicBookProps) {
  // 表紙の画像URL
  const coverPageSrc = props.baseUrl + '/' + props.coverImage
  // 裏表紙の画像URL
  const backCoverPageSrc = props.baseUrl + '/' + props.backCoverImage

  // 各種ページのソースURL
  const pageSrcArray = Array.from({ length: props.lastPageNumber - props.firstPageNumber + 1 }, (_, i) => {
    return getPageImageSrc(props.baseUrl, props.filename, props.firstPageNumber + i, props.format)
  })
  // ページソースをCDN経由アドレスに切り替える
  const pageSrcArrayRewritten = pageSrcArray.map((src) => rewriteImageURL(originImageOption, src))

  return (
    <div>
      <ComicBook
        originPageSrc={pageSrcArray}
        coverPageSrc={coverPageSrc}
        backCoverPageSrc={backCoverPageSrc}
        startPageLeftRight={props.firstPageLeftRight}
      />
      <p>
        ページ数: {props.firstPageNumber} から {props.lastPageNumber}
      </p>
      <p>フォーマット: {props.format}</p>
      <p>ファイル名: {props.filename}</p>
      <p>表紙の画像URL : {coverPageSrc}</p>
      {pageSrcArray.map((src, i) => {
        return (
          <p key={i}>
            {i + props.firstPageNumber}ページ: {src}
          </p>
        )
      })}
      <p>裏表紙の画像URL : {backCoverPageSrc}</p>
    </div>
  )
}

function getPageImageSrc(baseUrl: string, filename: string, pageNumber: number, format: string) {
  // 3桁まで0埋め
  const pageNumberStr = pageNumber.toString().padStart(3, '0')
  return `${baseUrl}/${filename}_${pageNumberStr}.${format}`
}
