import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitleH1 } from '../ui/card'
import Link from 'next/link'
import { convertJST } from '@/lib/time'
import Tags from '../middle/tags'
import { Button } from '../ui/button'
import ShareButton from '../small/share'
import { BookIcon, HomeIcon } from 'lucide-react'
import ArticleContent from '../middle/article_content'
import { categoryAPIResult, ParsedContent, TableOfContents } from 'api-types'

type ArticleProps = {
  id: string
  title: string
  updatedAt: string
  categories: categoryAPIResult[]
  parsedContents: ParsedContent[]
}

type FullAtricleProps = ArticleProps & {
  publishedAt: string
  type: 'blog' | 'info'
  shareURL: string
  tableOfContents: TableOfContents
  draftKey?: string
}

export async function Article({ id, title, updatedAt, parsedContents, categories }: ArticleProps) {
  return (
    <Card key={id} className="bg-gray-100">
      <CardHeader>
        <CardTitleH1>
          <Link href={`blog/${id}`} className="hover:underline">
            {title}
          </Link>
        </CardTitleH1>
        <CardDescription>{convertJST(updatedAt)}</CardDescription>
        <CardContent className="pl-0 pb-0">
          <Tags tags={categories} />
        </CardContent>
      </CardHeader>
      <hr className="border-gray-300 border-2 mx-6 mb-2 -mt-3" />
      <CardContent className="relative">
        <ArticleContent contents={parsedContents} sample articleID={id} />
        <div className="absolute p-6 pt-0 bottom-0 left-0 w-full h-36 bg-gradient-to-t from-gray-100/100 from-40% to-gray-100/0" />
      </CardContent>
      <CardFooter>
        <Button className="w-full gap-1 font-suse" asChild>
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
  tableOfContents,
  type,
  draftKey,
  shareURL,
}: FullAtricleProps) {
  return (
    <Card className="w-full bg-gray-100">
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
          <CardContent className="pl-0 pb-0">
            <Tags tags={categories} />
          </CardContent>
        )}
      </CardHeader>
      <hr className="border-gray-300 border-2 mx-6 mb-2 -mt-3" />
      <CardContent className="mb-8">
        <ArticleContent
          contents={parsedContents}
          articleID={id}
          tableOfContents={tableOfContents}
          draftKey={draftKey}
        />
      </CardContent>
      <CardFooter>
        <div className="w-full">
          <div className="flex gap-1 items-center justify-end">
            <ShareButton variant="twitter" url={shareURL} title={title} />
            <ShareButton variant="bluesky" url={shareURL} title={title} />
            <ShareButton variant="facebook" url={shareURL} title={title} />
            <ShareButton variant="copy_and_paste" url={shareURL} title={title} />
          </div>
          <div className="flex justify-center mt-2">
            <Button variant="secondary" className="w-96 flex justify-center gap-1" asChild>
              <Link href="/">
                <HomeIcon className="w-5 h-5" />
                <h2 className="text-xl font-suse">Home</h2>
              </Link>
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
