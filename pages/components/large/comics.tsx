import { ParsedContent, TableOfContents } from 'api-types'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitleH1 } from '../ui/card'
import { convertJST, convertJSTDate } from '@/lib/time'
import ArticleContent from '../middle/article_content'
import { Button } from '../ui/button'
import Link from 'next/link'
import { ArrowLeftSquareIcon, ArrowRightSquareIcon, ArrowUpSquareIcon, BookImageIcon, HomeIcon } from 'lucide-react'
import ShareButton from '../small/share'
import { getHostname } from '@/lib/env'
import ClientImage2 from '../small/client_image2'

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
  seriesId: string | null
  seriesName: string | null
  tagId: string
  tagName: string
  cover: string | null
  firstPage: string // 1ページ目のファイル名。結合済みで渡す
  parsedDescription: ParsedContent[]
  tableOfContents: TableOfContents
}

export async function ComicOverview(props: ComicArticleProps) {
  const contentsUrl = props.contentsUrl

  const contentsBaseURL = contentsUrl.replaceAll('/index.json', '')

  // 表紙、または1ページ目の画像URL
  const imageFile = props.cover || props.firstPage
  const imageURL = contentsBaseURL + '/' + imageFile
  // 説明文
  const description = props.parsedDescription
  // マンガのタイトル
  const title = props.titleName
  // マンガページのリンクURL
  const linkURL = `/comics/${props.id}`
  // 公開日・イベント情報
  const publishDate = props.publishDate ? convertJSTDate(props.publishDate) : '-'
  const publishEvent = props.publishEvent || '-'
  // シリーズ設定
  const series = props.seriesName || '-'
  // ジャンル設定
  const tag = props.tagName || '-'

  return (
    <Card className="w-full bg-gray-100">
      <CardHeader className="py-2"></CardHeader>
      <div className="flex sm:flex-row flex-col mb-2 gap-x-0 gap-y-2">
        <div className="px-6 pt-2 pb-0 sm:pr-0 flex justify-center">
          <ClientImage2 src={imageURL} alt={title} width={400} height={600} className="w-96 h-auto object-contain" />
        </div>
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
          <CardContent className="my-1 space-y-6 pb-2">
            <div className="w-full space-y-3 font-semibold">
              <h2 className="text-xl font-bold pl-2 pb-1 content-h2">作品情報</h2>
              <div>
                <p>初公開イベント名 : {publishEvent}</p>
                <p>初公開イベント日 : {publishDate} </p>
                <p>シリーズ : {series}</p>
                <p>ジャンル : {tag}</p>
              </div>
            </div>
            <div className="w-full space-y-3">
              <h2 className="text-xl font-bold pl-2 pb-1 content-h2">概要</h2>
              <ArticleContent contents={[description[0]]} sample articleID={props.id} />
            </div>
          </CardContent>
        </div>
      </div>
      <CardFooter>
        <Button variant="default" className="w-full gap-1 font-suse" asChild>
          <Link href={linkURL}>
            <BookImageIcon className="w-4 h-4" />
            Read This
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export function ComicDetailPage(props: ComicArticleProps) {
  const url = getHostname() + '/comics/' + props.id
  const isNextExist = props.nextId !== null
  const isPreviousExist = props.previousId !== null
  const isSereies = props.seriesName !== null
  const nextLink = isNextExist ? `/comics/${props.nextId}` : ''
  const previousLink = isPreviousExist ? `/comics/${props.previousId}` : ''
  const seriesLink = isSereies ? `/comics?series=${props.seriesId}` : ''

  const publishDate = props.publishDate ? convertJSTDate(props.publishDate) : '-'
  const publishEvent = props.publishEvent || '-'
  const seriesName = props.seriesName || '-'
  const tagName = props.tagName || '-'

  return (
    <Card className="w-full bg-gray-100">
      <CardContent className="py-2">
        <div className="mt-5 space-y-2">
          <h1 className="text-2xl font-bold pl-2 pb-1 content-h2">{props.titleName}</h1>
          <div className="flex items-center justify-end gap-2">
            <ShareButton variant="twitter" url={url} title={props.titleName} />
            <ShareButton variant="bluesky" url={url} title={props.titleName} />
            <ShareButton variant="copy_and_paste" url={url} title={props.titleName} />
          </div>
          <div className="w-full font-semibold flex justify-center items-center gap-10">
            <Button disabled={!isNextExist} variant="secondary" className="w-80 gap-1 font-suse" asChild={isNextExist}>
              <Link href={nextLink} className="flex items-center justify-center gap-1">
                <ArrowLeftSquareIcon className="w-4 h-4" />
                Next episode
              </Link>
            </Button>
            <Button
              disabled={!isPreviousExist}
              variant="secondary"
              className="w-80 gap-1 font-suse"
              asChild={isPreviousExist}
            >
              <Link href={previousLink} className="flex items-center justify-center gap-1">
                Previous episode
                <ArrowRightSquareIcon className="w-4 h-4" />
              </Link>
            </Button>
          </div>
          <div className="w-full font-semibold flex justify-center items-center gap-10">
            <Button disabled={!isSereies} variant="secondary" className="w-80 gap-1 font-suse" asChild={isSereies}>
              <Link href={seriesLink} className="flex items-center justify-center gap-1">
                <ArrowUpSquareIcon className="w-4 h-4" />
                This series
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
      <CardContent className="my-1 space-y-3">
        <h2 className="text-xl font-bold pb-1 border-blue-900 pl-3 border-l-4">作品詳細</h2>
        <div className="space-y-4 font-semibold">
          <div>
            <p>タイトル : {props.titleName}</p>
            <p>シリーズ : {seriesName}</p>
            <p>ジャンル : {tagName}</p>
          </div>
          <div>
            <p>作成日 : {convertJST(props.publishedAt)}</p>
            <p>最終更新日 : {convertJST(props.updatedAt)}</p>
          </div>
          <div>
            <p>初公開イベント名 : {publishEvent}</p>
            <p>初公開イベント日 : {publishDate}</p>
          </div>
        </div>
        <div className="space-x-4 flex justify-center">
          <Button className="w-48 gap-1 font-suse" asChild>
            <Link href="/comics">
              <BookImageIcon className="w-4 h-4" />
              Comics Page Top
            </Link>
          </Button>
          <Button className="w-48 gap-1 font-suse" asChild>
            <Link href="/">
              <HomeIcon className="w-4 h-4" />
              Page Home
            </Link>
          </Button>
        </div>
      </CardContent>
      <hr className="border-gray-600 mx-4 h-8" />
      <CardContent>
        <ArticleContent contents={props.parsedDescription} articleID={props.id} />
      </CardContent>
    </Card>
  )
}
