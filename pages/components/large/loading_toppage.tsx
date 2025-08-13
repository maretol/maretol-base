import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import TopPageTitle from '../small/toppage_title'
import { BookImageIcon, ImageIcon, InfoIcon, ListIcon, MailIcon, NotebookTextIcon } from 'lucide-react'
import { Button } from '../ui/button'
import Link from 'next/link'

export function LoadingTopPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-20">
        <div className="space-y-6">
          <div>
            <TopPageTitle>
              <ImageIcon className="w-6 h-6" />
              Illustrations
            </TopPageTitle>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 overflow-hidden">
              <div className="min-w-[300px] lg:min-w-[400px] h-full mb-10">
                <div className="w-full lg:h-[45svh] max-h-3/4 rounded-2xl bg-gray-100 flex lg:flex-row flex-col">
                  <Skeleton className="lg:w-3/4 w-full lg:h-full h-[40svh] rounded-2xl" />
                  <div className="p-4 h-full lg:w-1/4 flex flex-col lg:justify-between w-full gap-4">
                    <div className="flex flex-col gap-2 mt-4">
                      <div className="border-b-4 border-gray-300 pb-1">
                        <Skeleton className="w-3/4 h-6" />
                      </div>
                      <Skeleton className="w-1/2 h-4" />
                      <Skeleton className="w-1/3 h-4" />
                    </div>
                    <Skeleton className="w-full h-10" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <TopPageTitle>
              <BookImageIcon className="w-6 h-6" />
              Comics
            </TopPageTitle>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 overflow-hidden">
              <Card className="min-w-[300px] lg:min-w-[400px] h-full p-4 bg-gray-100">
                <CardContent className="space-y-4 p-0">
                  <Skeleton className="h-[200px] w-full" />
                  <div className="space-y-2">
                    <Skeleton className="w-3/4 h-6" />
                    <Skeleton className="w-1/2 h-4" />
                    <Skeleton className="w-2/3 h-4" />
                  </div>
                  <Skeleton className="w-full h-10" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <TopPageTitle>
              <NotebookTextIcon className="w-6 h-6" />
              Articles
            </TopPageTitle>
          </div>
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-gray-100">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="w-1/3 h-8" />
                  <div className="flex gap-2">
                    <Skeleton className="w-20 h-4" />
                    <Skeleton className="w-16 h-4" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="w-full h-4" />
                    <Skeleton className="w-5/6 h-4" />
                    <Skeleton className="w-4/6 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="w-full">
            <Button asChild variant="outline" className="w-full bg-gray-100 hover:bg-white">
              <Link href="/blog">See all blog articles</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <TopPageTitle>
              <ListIcon className="w-6 h-6" />
              Other Contents
            </TopPageTitle>
          </div>
          <div className="flex md:flex-row flex-col gap-4 justify-center items-center">
            <Button asChild variant="outline" className="w-full max-w-96">
              <Link href="/about">
                <div className="flex items-center gap-2">
                  <InfoIcon className="h-6 w-6" /> <p>About : このサイトについて</p>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full max-w-96">
              <Link href="/contact">
                <div className="flex items-center gap-2">
                  <MailIcon className="h-6 w-6" /> <p>Contact : 連絡はこちら</p>
                </div>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
