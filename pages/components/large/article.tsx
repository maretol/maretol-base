import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitleH1 } from '../ui/card'
import Link from 'next/link'
import { convertJST } from '@/lib/time'
import Tags from '../middle/tags'
import { Button } from '../ui/button'
import ShareButton from '../small/share'
import { ArrowBigLeft, BookIcon, HomeIcon } from 'lucide-react'
import ArticleContent from '../middle/article_content'
import { rewriteImageURL } from '@/lib/image'
import { originImageOption } from '@/lib/static'
import ClientImage from '../small/client_image'
import { categoryAPIResult, ParsedContent } from 'api-types'

type ArticleProps = {
  id: string
  title: string
  updatedAt: string
  categories: categoryAPIResult[]
  rawContent: string
  parsedContents: ParsedContent[]
}

type FullAtricleProps = ArticleProps & {
  publishedAt: string
  type: 'blog' | 'info'
  shareURL: string
}

type ImageArticleProps = ArticleProps & {
  imageSrc: string
  shareURL: string
}

export async function Article({ id, title, updatedAt, parsedContents, categories }: ArticleProps) {
  return (
    <Card key={id}>
      <CardHeader>
        <CardTitleH1>
          <Link href={`blog/${id}`} className="hover:underline">
            {title}
          </Link>
        </CardTitleH1>
        <CardDescription>{convertJST(updatedAt)}</CardDescription>
        <CardContent className="pl-0 pt-2 pb-0">
          <Tags tags={categories} />
        </CardContent>
      </CardHeader>
      <CardContent className="relative">
        <ArticleContent contents={parsedContents} sample articleID={id} />
        <div className="absolute p-6 pt-0 bottom-0 left-0 w-full h-24 bg-gradient-to-t to-opacity-100 from-opacity-0" />
      </CardContent>
      <CardFooter>
        <Button className="w-full gap-1" asChild>
          <Link href={`/blog/${id}`}>
            <BookIcon className="w-4 h-4" />
            Read more...
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export async function FullArticle({
  id,
  title,
  publishedAt,
  updatedAt,
  categories,
  parsedContents,
  type,
  shareURL,
}: FullAtricleProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitleH1>{title}</CardTitleH1>
        <CardDescription>
          {type === 'blog' ? (
            <>
              作成日{convertJST(publishedAt)} <br />
              最終更新{convertJST(updatedAt)}
            </>
          ) : (
            <>最終更新日{convertJST(updatedAt)}</>
          )}
        </CardDescription>
        {type === 'blog' && (
          <CardContent className="pl-0 pt-2 pb-0">
            <Tags tags={categories} />
          </CardContent>
        )}
      </CardHeader>
      <CardContent className="my-8">
        <ArticleContent contents={parsedContents} articleID={id} />
      </CardContent>
      <CardFooter>
        <div className="w-full">
          <div className="flex gap-1 items-center">
            <p>Share : </p>
            <ShareButton variant="twitter" url={shareURL} title={title} />
            <ShareButton variant="facebook" url={shareURL} title={title} />
            <ShareButton variant="copy_and_paste" url={shareURL} title={title} />
          </div>
          <div className="flex justify-center mt-2">
            <Button variant="secondary" className="w-96 flex justify-center gap-1" asChild>
              <Link href="/">
                <HomeIcon className="w-5 h-5" />
                <h2 className="text-xl">Home</h2>
              </Link>
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

export function ImageArticle({ id, title, categories, imageSrc, shareURL }: ImageArticleProps) {
  const rewrittenImageSrc = rewriteImageURL(originImageOption, imageSrc)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitleH1>
          <div className="text-base">Image</div>
          <div className="">{title}</div>
        </CardTitleH1>
        <CardContent className="pl-0 pt-2 pb-0">
          <Tags tags={categories} />
        </CardContent>
      </CardHeader>
      <CardContent className="my-8">
        <div className="flex justify-center">
          <ClientImage
            src={rewrittenImageSrc}
            alt={title}
            width={800}
            height={800}
            className="w-full h-full shadow-lg"
          />
        </div>
        <div className="my-8 flex justify-center">
          <Button variant="secondary" className="w-96 text-base" asChild>
            <Link href={`/blog/${id}`}>
              <ArrowBigLeft className="w-5 h-5" />
              Back to article of this image
            </Link>
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <div className="w-full">
          <div className="flex gap-1 items-center">
            <p>Share : </p>
            <ShareButton variant="twitter" url={shareURL} title={title} />
            <ShareButton variant="facebook" url={shareURL} title={title} />
            <ShareButton variant="copy_and_paste" url={shareURL} title={title} />
          </div>
          <div className="flex justify-center mt-2">
            <Button variant="secondary" className="w-96 flex justify-center gap-1" asChild>
              <Link href="/">
                <HomeIcon className="w-5 h-5" />
                <h2 className="text-xl">Home</h2>
              </Link>
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
