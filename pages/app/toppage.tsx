import { Article } from '@/components/large/article'
import { ComicOverview } from '@/components/large/comics'
import { IllustSampleArticle } from '@/components/large/illust_article'
import TopPageContentsChild from '@/components/large/toppage/toppage_child'
import TopPageContentsViewer from '@/components/large/toppage/toppage_contents'
import TopPageTitle from '@/components/small/toppage_title'
import { Button } from '@/components/ui/button'
import { getAteliers, getBandeDessinee, getCMSContents } from '@/lib/api/workers'
import { BookImageIcon, ImageIcon, InfoIcon, ListIcon, MailIcon, NotebookTextIcon } from 'lucide-react'
import Link from 'next/link'

export default async function TopPage() {
  const blogs = await getCMSContents(0, 5)
  const ateliers = await getAteliers(0, 5)
  const bandeDessinees = await getBandeDessinee(0, 5)

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
          <TopPageContentsViewer moreLink="/illust" moreButtonText="See all illustrations">
            {ateliers.ateliers.map((atelier) => (
              <TopPageContentsChild key={atelier.id}>
                <IllustSampleArticle
                  id={atelier.id}
                  title={atelier.title}
                  imageSrc={atelier.src}
                  objectPosition={atelier.object_position}
                  tags={atelier.tag_or_category}
                  publishedAt={atelier.publishedAt}
                  className=""
                />
              </TopPageContentsChild>
            ))}
          </TopPageContentsViewer>
        </div>
        <div className="space-y-6">
          <div>
            <TopPageTitle>
              <BookImageIcon className="w-6 h-6" />
              Comics
            </TopPageTitle>
          </div>
          <TopPageContentsViewer moreLink="/comics" moreButtonText="See all comics">
            {bandeDessinees.bandeDessinees.map((bande) => (
              <TopPageContentsChild key={bande.id}>
                <ComicOverview
                  key={bande.id}
                  id={bande.id}
                  publishedAt={bande.publishedAt}
                  updatedAt={bande.updatedAt}
                  titleName={bande.title_name}
                  publishDate={bande.publish_date ?? null}
                  publishEvent={bande.publish_event ?? null}
                  contentsUrl={bande.contents_url}
                  seriesId={bande.series?.id ?? null}
                  seriesName={bande.series?.series_name ?? null}
                  tagId={bande.tag.id}
                  tagName={bande.tag.tag_name}
                  nextId={bande.next_id ?? null}
                  previousId={bande.previous_id ?? null}
                  cover={bande.cover ?? null}
                  firstPage={bande.filename + '_00' + bande.first_page + bande.format[0]}
                  parsedDescription={bande.parsed_description}
                  tableOfContents={bande.table_of_contents}
                />
              </TopPageContentsChild>
            ))}
          </TopPageContentsViewer>
        </div>
        <div className="space-y-6">
          <div>
            <TopPageTitle>
              <NotebookTextIcon className="w-6 h-6" />
              Articles
            </TopPageTitle>
          </div>
          {blogs.contents.slice(0, 3).map((content) => (
            <Article
              key={content.id}
              id={content.id}
              title={content.title}
              updatedAt={content.updatedAt}
              categories={content.categories}
              parsedContents={content.parsed_content}
            />
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
