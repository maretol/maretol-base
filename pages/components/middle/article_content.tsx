import P from './article_dom/p'
import Hn from './article_dom/h'
import ContentImage from './article_dom/image'
import YouTubeArea from './article_dom/youtube'
import TwitterArea from './article_dom/twitter'
import Div from './article_dom/div'
import LinkCard from './article_dom/linkcard'
import { cn } from '@/lib/utils'
import Br from './article_dom/br'
import Blockquote from './article_dom/blockquote'
import { ParsedContent, TableOfContents } from 'api-types'
import { Suspense } from 'react'
import LoadingLinkcard from './loading_dom/loading_linkcard'
import BlogCard from './article_dom/blogcard'
import LoadingBlogCard from './loading_dom/loading_blogcard'
import Table from './article_dom/table_of_contents'
import ArtifactCard from './article_dom/artifactcard'
import AmazonArea from './article_dom/amazon'
import ComicPageCard from './article_dom/comiccard'

export default async function ArticleContent({
  contents,
  articleID,
  sample,
  tableOfContents,
}: {
  contents: ParsedContent[]
  articleID: string
  sample?: boolean
  tableOfContents?: TableOfContents
}) {
  const sampleFlag = sample || false
  const sampleClassName = 'content-sample line-clamp-6 max-h-72'
  const contentClassName = 'content'
  const className = sampleFlag ? sampleClassName : contentClassName

  return (
    <div className={cn(className)}>
      {contents.map((c, i) => {
        // sampleの場合はコンテンツは6つまででいい
        if (sampleFlag && i > 5) {
          return
        }
        const tagName = c.tag_name
        const attrs = c.attributes
        const text = c.text
        const innerHTML = c.inner_html

        // h1 ~ h5
        // 正規表現でヒットさせる
        if (tagName.match(/h[1-5]/)) {
          return <Hn key={i} tag={tagName} text={text} attrs={attrs} />
        }

        // hr
        if (tagName === 'hr') {
          return (
            <div key={i} className="py-8">
              <hr className="border-gray-500" />
            </div>
          )
        }

        // table。面倒なのでそのままにするができれば適当なコンポーネントに
        if (tagName === 'table') {
          if (innerHTML) {
            return <table key={i} dangerouslySetInnerHTML={{ __html: innerHTML }} />
          }
        }

        // div
        if (tagName === 'div') {
          if (innerHTML) {
            return <Div key={i} innerHTML={innerHTML} attrs={attrs} />
          }
        }

        // list
        if (tagName === 'ul') {
          return <ul key={i} dangerouslySetInnerHTML={{ __html: innerHTML || '' }} className="py-4" />
        }
        if (tagName === 'ol') {
          return <ol key={i} dangerouslySetInnerHTML={{ __html: innerHTML || '' }} className="py-4" />
        }

        // blockquote
        if (tagName === 'blockquote') {
          return <Blockquote key={i} innerHTML={innerHTML || ''} text={text} />
        }

        // p
        if (tagName === 'p') {
          const pOption = c.p_option
          if (pOption === null || pOption === 'normal') {
            // 本来 p タグは p_option が入っているが、万が一の場合の抜け道
            // 通常テキストの場合と同じ扱い
            return <P key={i} innerHTML={innerHTML || text} attrs={attrs} />
          } else if (pOption === 'image') {
            // 自前の画像URLを画像系コンポーネントで表示
            const src = text
            const tag = 'content_image'
            const subText = c.sub_texts
            return (
              <div key={i} className="py-6">
                <ContentImage key={i} tag={tag} src={src} subText={subText} articleID={articleID} />
              </div>
            )
          } else if (pOption === 'photo') {
            // photo.maretol.xyz の画像を表示
            const tag = 'content_photo'
            const src = text
            const subText = c.sub_texts
            return (
              <div key={i} className="py-6">
                <ContentImage key={i} tag={tag} src={src} subText={subText} articleID={articleID} />
              </div>
            )
          } else if (pOption === 'youtube') {
            // YouTubeの埋め込み
            return <YouTubeArea key={i} videoURL={text} />
          } else if (pOption === 'twitter') {
            // Twitterの埋め込み
            return <TwitterArea key={i} twitterURL={text} />
          } else if (pOption === 'amazon') {
            // Amazonのリンク
            return <AmazonArea key={i} amazonURL={text} />
          } else if (pOption === 'url') {
            // URLのみの場合、リンクカードに対応させる
            return (
              <div key={i} className="py-6">
                <Suspense fallback={<LoadingLinkcard link={text} />}>
                  <LinkCard link={text} />
                </Suspense>
              </div>
            )
          } else if (pOption === 'blog') {
            // ブログの別記事の場合、専用のリンクカードにいれる
            return (
              <div key={i} className="py-6">
                <Suspense fallback={<LoadingBlogCard />}>
                  <BlogCard link={text} />
                </Suspense>
              </div>
            )
          } else if (pOption === 'artifact') {
            return (
              <div key={i} className="py-6">
                <Suspense fallback={<LoadingBlogCard />}>
                  <ArtifactCard link={text} />
                </Suspense>
              </div>
            )
          } else if (pOption === 'comic') {
            // 漫画ページへのリンク
            return (
              <div key={i} className="py-6">
                <Suspense fallback={<div>loading comic</div>}>
                  <ComicPageCard link={text} />
                </Suspense>
              </div>
            )
          } else if (pOption === 'empty') {
            // 空行の場合。改行をいれる
            return <Br key={i} />
          } else if (pOption === 'table_of_contents') {
            if (tableOfContents) {
              return <Table key={i} toc={tableOfContents} />
            } else {
              // 目次情報がない場合は何も表示しない
              return
            }
          }
          // どれにも該当しない場合。ほぼないはずだが、新規の p_option が追加された場合必要になる
          return <P key={i} innerHTML={innerHTML || text} attrs={attrs} />
        }

        return (
          <div key={i}>
            <p>known tag error : {tagName}</p>
            <div dangerouslySetInnerHTML={{ __html: innerHTML || '' }} />
          </div>
        )
      })}
    </div>
  )
}
